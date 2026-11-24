import type { Metadata } from "next";
import ChatWaveApp from "@/components/chatwave/chatwave-app";
import "@/components/chatwave/chatwave.css";

export const metadata: Metadata = {
  title: "ChatWave — conversations that flow",
  description: "A thoughtfully designed space for your conversations."
};

export default function ChatWavePage() {
  return <ChatWaveApp />;
}
