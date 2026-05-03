import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquare, User2 } from "lucide-react";
import type { LawyerConversationSession, LawyerChatRowWithUser } from "@/lib/lawyerChats";

type Props = {
  session: LawyerConversationSession | null;
  replyText: string;
  onReplyChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  formatTime: (iso: string) => string;
};

/**
 * Lawyer-facing thread: client (user) messages on the right, lawyer messages on the left.
 */
export function LawyerClientChatPanel({
  session,
  replyText,
  onReplyChange,
  onSend,
  sending,
  formatTime,
}: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, session?.user_id]);

  if (!session) {
    return (
      <Card className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
        <MessageSquare className="mb-3 h-12 w-12 text-slate-300" />
        <p className="text-base font-semibold text-slate-600">Select a conversation</p>
        <p className="mt-1 text-sm text-slate-500">Choose a client from the list to read and reply.</p>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 shadow-sm">
      <div className="border-b border-border/50 bg-gradient-to-r from-slate-50 to-transparent px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-gradient-to-br from-blue-100 to-blue-50">
              <User2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{session.user_name}</p>
              <p className="truncate text-sm text-slate-500">{session.user_email}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-500">Thread</p>
            <p className="text-sm font-semibold text-slate-700">{session.messageCount} messages</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/30 px-6 py-4">
        <div className="space-y-4">
          {session.messages.map((msg: LawyerChatRowWithUser) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-3 text-sm shadow-sm ${
                  msg.sender === "user"
                    ? "border border-slate-200 bg-white text-slate-900"
                    : "bg-blue-600 text-white"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
                    {msg.sender === "user" ? "Client" : "You"}
                  </span>
                  <span className="text-xs opacity-60">{formatTime(msg.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="space-y-3 border-t border-border/50 bg-white px-6 py-4">
        <Textarea
          value={replyText}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder="Type your reply…"
          className="min-h-[100px] resize-none focus:border-blue-500 focus:ring-blue-500"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-600">
            Replying to <span className="font-semibold text-slate-900">{session.user_name}</span>
          </p>
          <Button
            type="button"
            onClick={onSend}
            disabled={!replyText.trim() || sending}
            className="gap-2 bg-gradient-hero text-white shadow-sm hover:bg-gradient-hero/90"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send reply
          </Button>
        </div>
      </div>
    </Card>
  );
}
