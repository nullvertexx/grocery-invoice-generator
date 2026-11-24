create extension if not exists pgcrypto;

create type public.conversation_kind as enum ('direct', 'group');
create type public.member_role as enum ('member', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(display_name) between 1 and 80),
  bio text not null default '' check (length(bio) <= 280),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'direct',
  title text check (title is null or length(title) between 1 and 100),
  avatar_path text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  direct_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'direct' and direct_key is not null) or (kind = 'group' and direct_key is null))
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_until timestamptz,
  archived_at timestamptz,
  pinned_at timestamptz,
  primary key (conversation_id, user_id)
);
create index conversation_members_by_user on public.conversation_members(user_id, pinned_at desc nulls last, joined_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  reply_to uuid references public.messages(id) on delete set null,
  body text not null check (length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index messages_page on public.messages(conversation_id, created_at desc, id desc);
create index messages_sender on public.messages(sender_id, created_at desc);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  object_path text not null unique,
  display_name text not null check (length(display_name) between 1 and 180),
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 26214400),
  created_at timestamptz not null default now()
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (length(emoji) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id)
);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (length(reason) between 3 and 1000),
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  online_visibility boolean not null default true,
  read_receipts boolean not null default true,
  notifications_enabled boolean not null default true,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message', 'invite', 'mention', 'report')),
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread on public.notifications(user_id, created_at desc) where read_at is null;

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  description text not null default '' check (length(description) <= 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9-]{1,60}$'),
  description text not null default '' check (length(description) <= 300),
  created_at timestamptz not null default now(),
  unique (community_id, name)
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  check (num_nonnulls(community_id, conversation_id) = 1)
);

-- Membership predicates use invoker rights. Table ownership and RLS must not be
-- bypassed by client supplied IDs; every policy is still evaluated in Postgres.
create function public.is_conversation_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members cm where cm.conversation_id = target and cm.user_id = (select auth.uid()))
$$;
create function public.is_community_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_members cm where cm.community_id = target and cm.user_id = (select auth.uid()))
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_receipts enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;
alter table public.user_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.channels enable row level security;
alter table public.invitations enable row level security;

create policy "profiles are discoverable to signed in users" on public.profiles for select to authenticated using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "members read conversations" on public.conversations for select to authenticated using (public.is_conversation_member(id));
create policy "authenticated users create conversations" on public.conversations for insert to authenticated with check (created_by = (select auth.uid()));
create policy "members read membership" on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "conversation creators add themselves" on public.conversation_members for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = (select auth.uid())));
create policy "users update own membership settings" on public.conversation_members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "conversation members read messages" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "members send own messages" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id));
create policy "authors edit own messages" on public.messages for update to authenticated using (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id)) with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id));
create policy "members read attachments" on public.message_attachments for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id)));
create policy "message authors attach files" on public.message_attachments for insert to authenticated with check (exists (select 1 from public.messages m where m.id = message_id and m.sender_id = (select auth.uid()) and public.is_conversation_member(m.conversation_id)));
create policy "members read reactions" on public.message_reactions for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id)));
create policy "users manage own reactions" on public.message_reactions for all to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id))) with check (user_id = (select auth.uid()) and exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id)));
create policy "members read receipts" on public.message_receipts for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id)));
create policy "users manage own receipts" on public.message_receipts for all to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id))) with check (user_id = (select auth.uid()) and exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id)));
create policy "users manage their blocks" on public.user_blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create policy "users create reports" on public.user_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reporters see own reports" on public.user_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "users manage own settings" on public.user_settings for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members read communities" on public.communities for select to authenticated using (public.is_community_member(id));
create policy "signed in users create communities" on public.communities for insert to authenticated with check (created_by = (select auth.uid()));
create policy "members read community membership" on public.community_members for select to authenticated using (public.is_community_member(community_id));
create policy "members read channels" on public.channels for select to authenticated using (public.is_community_member(community_id));
create policy "community members read invitations" on public.invitations for select to authenticated using ((community_id is not null and public.is_community_member(community_id)) or (conversation_id is not null and public.is_conversation_member(conversation_id)));

-- Realtime must be enabled for messages in Supabase dashboard or migration tooling.
-- Storage object policies are installed after creating the private `chat-attachments` bucket.
