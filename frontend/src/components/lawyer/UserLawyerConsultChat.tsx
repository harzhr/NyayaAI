import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send } from "lucide-react";
import type { LawyerChatRow } from "@/lib/lawyerChats";

type Props = {
  messages: LawyerChatRow[];
  loading: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  canSend: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Shown under the title (e.g. specialization or demo note). */
  consultSubtitle?: string;
  isDemoConsult?: boolean;
};

/**
 * End-user consultation UI: your messages on the right, lawyer on the left.
 * Standalone from AI Chat and lawyer dashboard components.
 */
export function UserLawyerConsultChat({
  messages,
  loading,
  input,
  onInputChange,
  onSend,
  sending,
  canSend,
  onKeyDown,
  consultSubtitle,
  isDemoConsult,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, loading]);

  return (
    <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Lawyer consultation</p>
            <p className="text-xs text-muted-foreground">
              {consultSubtitle ?? "Secure thread tied to your account."}
            </p>
            {isDemoConsult && (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                Demo advocate — this thread is only on your account until a real lawyer on NyayaAI is linked the same way.
              </p>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-muted/40 bg-muted/5 p-10 text-center text-sm text-muted-foreground">
              No messages yet. Send your first question to reach a lawyer.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm shadow-sm ${
                    message.sender === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm border border-border bg-card text-card-foreground"
                  }`}
                >
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {message.sender === "user" ? "You" : "Lawyer"}
                  </div>
                  {message.message}
                  <div className="mt-2 text-right text-[11px] opacity-80">
                    {new Intl.DateTimeFormat("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(message.created_at))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={canSend ? "Message your lawyer…" : "Sign in to send messages."}
            disabled={!canSend}
            className="min-h-[120px] flex-1 resize-none"
          />
          <Button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || !canSend || sending}
            className="min-w-[140px] shrink-0"
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
