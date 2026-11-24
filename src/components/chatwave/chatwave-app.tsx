"use client";

import { useMemo, useState } from "react";
import {
  Archive, ArrowDown, ArrowLeft, AtSign, Bell, CheckCheck, ChevronDown,
  CircleHelp, FileText, Hash, Image as ImageIcon, Info, MessageCircle,
  MoreHorizontal, Paperclip, Plus, Search, Send, Settings2, Smile, Sparkles,
  Users, Video, X
} from "lucide-react";

type Chat = { id: string; name: string; initials: string; color: string; preview: string; time: string; unread?: number; online?: boolean; group?: boolean; pinned?: boolean };

const chats: Chat[] = [
  { id: "maya", name: "Maya Chen", initials: "MC", color: "rose", preview: "That sounds perfect. See you there!", time: "2m", unread: 2, online: true, pinned: true },
  { id: "studio", name: "Studio friends", initials: "SF", color: "violet", preview: "Jonah: dropped the new mockups ✨", time: "18m", unread: 4, group: true, pinned: true },
  { id: "eli", name: "Eli Morgan", initials: "EM", color: "blue", preview: "Voice message · 0:18", time: "1h", online: true },
  { id: "weekend", name: "Weekend hikers", initials: "WH", color: "green", preview: "Priya: trail looks incredible", time: "3h", group: true },
  { id: "noah", name: "Noah Williams", initials: "NW", color: "amber", preview: "You: Sent you the playlist", time: "Yesterday" },
  { id: "design", name: "Design circle", initials: "DC", color: "cyan", preview: "Amara: Love this direction", time: "Yesterday", group: true }
];

const people: Record<string, { status: string; about: string }> = {
  maya: { status: "Around today", about: "Making thoughtful things, one pixel at a time." },
  studio: { status: "6 members · 3 online", about: "A little corner for the people who make things." },
  eli: { status: "Online now", about: "Outside is free therapy 🌿" },
  weekend: { status: "8 members · 2 online", about: "Fresh air, good company, questionable snacks." },
  noah: { status: "Last seen yesterday", about: "Music on, world off." },
  design: { status: "12 members · 4 online", about: "Sharing work and getting a little better together." }
};

const starters = [
  { mine: false, text: "Hey! How’s your week going? ☀️", time: "10:24 AM" },
  { mine: true, text: "Pretty lovely so far. Finally got a bit of sunshine between meetings.", time: "10:27 AM" },
  { mine: false, text: "I know, right? I took the long way home yesterday just to enjoy it 🌿", time: "10:29 AM" },
  { mine: true, text: "That’s the best kind of detour. We should do a proper catch-up soon.", time: "10:32 AM" },
  { mine: false, text: "Yes! There’s a little café by the park I’ve been meaning to try.", time: "10:34 AM" }
];

export default function ChatWaveApp() {
  const [activeId, setActiveId] = useState("maya");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(true);
  const [mobileChat, setMobileChat] = useState(false);
  const [notice, setNotice] = useState("");
  const active = chats.find((chat) => chat.id === activeId) ?? chats[0];
  const filtered = useMemo(() => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())), [query]);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function sendMessage() {
    const clean = draft.trim();
    if (!clean) return;
    setSent((messages) => [...messages, clean]);
    setDraft("");
    showNotice("This preview doesn’t have a messaging server connected yet.");
  }

  return (
    <main className="cw-shell">
      <aside className={`cw-rail ${mobileChat ? "cw-hidden-mobile" : ""}`}>
        <div className="cw-brand"><div className="cw-brand-mark"><MessageCircle size={21} fill="currentColor" strokeWidth={1.6} /></div><span>chatwave</span><span className="cw-brand-spark">✳</span></div>
        <div className="cw-account"><div className="cw-avatar avatar-slate">JD<span className="cw-presence" /></div><div className="cw-account-text"><strong>Jordan Davis</strong><small>My personal space</small></div><button className="cw-icon-button" aria-label="Account menu"><ChevronDown size={16} /></button></div>
        <div className="cw-search"><Search size={16} /><input aria-label="Search conversations" placeholder="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div>
        <nav className="cw-nav" aria-label="Main navigation"><button className="cw-nav-item selected"><MessageCircle size={17} /> Messages <span className="cw-nav-count">3</span></button><button className="cw-nav-item" onClick={() => showNotice("Community spaces are coming in a later phase.")}><Users size={17} /> Communities</button><button className="cw-nav-item" onClick={() => showNotice("Mentions will appear here when connected.")}><AtSign size={17} /> Mentions</button></nav>
        <div className="cw-list-head"><span>MESSAGES</span><button className="cw-icon-button" aria-label="Start a conversation" onClick={() => showNotice("Start a conversation after connecting your account.")}><Plus size={17} /></button></div>
        <div className="cw-chat-list">{filtered.map((chat) => <button key={chat.id} className={`cw-chat-row ${chat.id === activeId ? "active" : ""}`} onClick={() => { setActiveId(chat.id); setMobileChat(true); setSent([]); }}><Avatar chat={chat} /><span className="cw-chat-meta"><span className="cw-chat-name">{chat.name}{chat.pinned && <span className="cw-pin">✦</span>}</span><span className="cw-chat-preview">{chat.preview}</span></span><span className="cw-chat-side"><small>{chat.time}</small>{chat.unread ? <b>{chat.unread}</b> : null}</span></button>)}</div>
        <div className="cw-rail-bottom"><button className="cw-nav-item" onClick={() => showNotice("Settings will be available with your account.")}><Settings2 size={17} /> Settings</button><button className="cw-nav-item" onClick={() => showNotice("Help center is not connected yet.")}><CircleHelp size={17} /> Help & feedback</button><div className="cw-plan"><div className="cw-plan-icon"><Sparkles size={15} /></div><div><strong>A little more room?</strong><small>See what ChatWave can do</small></div><ChevronDown size={15} className="cw-plan-chevron" /></div></div>
      </aside>

      <section className={`cw-conversation ${mobileChat ? "cw-show-mobile" : ""}`} aria-label={`Conversation with ${active.name}`}>
        <header className="cw-chat-header"><button className="cw-back cw-icon-button" aria-label="Back to conversations" onClick={() => setMobileChat(false)}><ArrowLeft size={18} /></button><Avatar chat={active} large /><div className="cw-header-person"><strong>{active.name}</strong><span><i className={active.online ? "online" : "offline"} />{people[active.id]?.status}</span></div><div className="cw-header-actions"><button className="cw-icon-button" aria-label="Start video call" onClick={() => showNotice("Calling isn’t available in this preview.")}><Video size={18} /></button><button className="cw-icon-button" aria-label="Conversation notifications" onClick={() => showNotice("Notifications are a preview only.")}><Bell size={18} /></button><span className="cw-action-divider" /><button className={`cw-icon-button ${showDetails ? "active" : ""}`} aria-label="Toggle conversation details" onClick={() => setShowDetails(!showDetails)}><Info size={18} /></button><button className="cw-icon-button" aria-label="More conversation actions" onClick={() => showNotice("More conversation actions will be available soon.")}><MoreHorizontal size={19} /></button></div></header>
        <div className="cw-date-divider"><span /> <small>TODAY</small> <span /></div>
        <div className="cw-message-area" aria-live="polite">
          <div className="cw-history-note"><span>✳</span><p>This is the start of your conversation with <strong>{active.name}</strong>.</p></div>
          {active.id === "maya" ? starters.map((message, index) => <Message key={`${activeId}-${index}`} mine={message.mine} text={message.text} time={message.time} chat={active} />) : <div className="cw-empty-chat"><div className="cw-empty-icon"><MessageCircle size={24} /></div><strong>A fresh conversation</strong><span>Say hello to {active.name} and get things flowing.</span></div>}
          {sent.map((text, index) => <Message key={`sent-${index}`} mine text={text} time="Now" chat={active} />)}
          <div className="cw-scroll-bottom"><ArrowDown size={15} /></div>
        </div>
        <div className="cw-compose-wrap"><div className="cw-compose"><textarea aria-label="Write a message" placeholder={`Message ${active.name}…`} value={draft} rows={1} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} /><div className="cw-compose-toolbar"><div className="cw-compose-tools"><button className="cw-icon-button" aria-label="Attach file" onClick={() => showNotice("Attachments will be available after storage is configured.")}><Paperclip size={17} /></button><button className="cw-icon-button" aria-label="Add image" onClick={() => showNotice("Image sharing will be available after storage is configured.")}><ImageIcon size={17} /></button><button className="cw-icon-button" aria-label="Add emoji" onClick={() => setDraft((value) => `${value} 😊`)}><Smile size={17} /></button></div><div className="cw-send-hint"><span>Enter to send · Shift + Enter for new line</span><button className="cw-send-button" aria-label="Send message" onClick={sendMessage} disabled={!draft.trim()}><Send size={16} /></button></div></div></div><p className="cw-encryption-note"><Info size={12} /> Messages are stored securely when you connect your ChatWave account.</p></div>
        {notice && <div className="cw-toast" role="status"><Info size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14} /></button></div>}
      </section>

      {showDetails && <aside className={`cw-details ${mobileChat ? "cw-details-mobile" : ""}`}><div className="cw-details-head"><span>DETAILS</span><button className="cw-icon-button cw-mobile-close" aria-label="Close details" onClick={() => setShowDetails(false)}><X size={17} /></button><button className="cw-icon-button" aria-label="Details options" onClick={() => showNotice("Conversation settings will be available soon.")}><MoreHorizontal size={18} /></button></div><div className="cw-profile"><Avatar chat={active} profile /><h2>{active.name}</h2><p>{people[active.id]?.about}</p><span className="cw-profile-status"><i className={active.online ? "online" : "offline"} />{people[active.id]?.status}</span><div className="cw-profile-actions"><button onClick={() => showNotice("Search is available from the conversation list.")}><Search size={16} /><span>Search</span></button><button onClick={() => showNotice("Notifications are a preview only.")}><Bell size={16} /><span>Mute</span></button><button onClick={() => showNotice("Conversation archived after account setup.")}><Archive size={16} /><span>Archive</span></button></div></div><div className="cw-detail-section"><div className="cw-detail-title"><span>SHARED MEDIA</span><button onClick={() => showNotice("Shared media will show up here.")}>See all</button></div><div className="cw-media-grid"><div className="cw-media-card media-sun"><span>☀️</span><small>Weekend plans</small></div><div className="cw-media-card media-leaf"><span>🌿</span><small>Little detour</small></div><div className="cw-media-card media-coffee"><span>☕</span><small>Café idea</small></div></div></div><div className="cw-detail-section"><div className="cw-detail-title"><span>SHARED FILES</span><button onClick={() => showNotice("No shared files yet.")}>See all</button></div><button className="cw-file-row" onClick={() => showNotice("File sharing will be available after storage is configured.")}><div className="cw-file-icon"><FileText size={17} /></div><span><strong>Nothing shared yet</strong><small>Files will appear here</small></span></button></div><div className="cw-detail-section cw-community"><div className="cw-community-icon"><Hash size={17} /></div><div><strong>Good things grow here</strong><p>Bring your people together in a community space.</p><button onClick={() => showNotice("Communities are coming in a later phase.")}>Explore communities <ArrowLeft size={13} /></button></div></div><div className="cw-details-foot"><span>ChatWave preview</span><span>Thoughtfully made for good conversations <Sparkles size={12} /></span></div></aside>}
    </main>
  );
}

function Avatar({ chat, large = false, profile = false }: { chat: Chat; large?: boolean; profile?: boolean }) {
  return <span className={`cw-avatar avatar-${chat.color} ${large ? "large" : ""} ${profile ? "profile" : ""}`} aria-hidden="true">{chat.initials}{chat.online && <i className="cw-presence" />}</span>;
}

function Message({ mine, text, time, chat }: { mine: boolean; text: string; time: string; chat: Chat }) {
  return <div className={`cw-message-row ${mine ? "mine" : ""}`}>{!mine && <Avatar chat={chat} />}<div className="cw-message-content"><span className="cw-message-author">{mine ? "You" : chat.name}</span><div className="cw-bubble">{text}</div><div className="cw-message-meta"><time>{time}</time>{mine && <CheckCheck size={14} className="cw-read" />}{!mine && <button aria-label="React to message" className="cw-react" title="React to message">＋</button>}</div></div></div>;
}
