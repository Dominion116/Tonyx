import { Chat } from '@/components/chat/chat';

export default function MiniAppChat() {
  // Fill the viewport between the header and the dock.
  return (
    <div className="h-[calc(100dvh-9.5rem)]">
      <Chat />
    </div>
  );
}
