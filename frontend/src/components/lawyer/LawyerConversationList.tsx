import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, CheckCheck } from "lucide-react";
import type { LawyerConversationSession } from "@/lib/lawyerChats";

type Props = {
  sessions: LawyerConversationSession[];
  selectedThreadKey: string | null;
  loading: boolean;
  onSelect: (session: LawyerConversationSession) => void;
  formatTime: (iso: string) => string;
  formatDateLabel: (iso: string) => string;
};

export function LawyerConversationList({
  sessions,
  selectedThreadKey,
  loading,
  onSelect,
  formatTime,
  formatDateLabel,
}: Props) {
  return (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No conversations yet</p>
            <p className="mt-1 text-xs text-slate-400">Client messages will appear here.</p>
          </div>
        ) : (
          sessions.map((session) => {
            const active = session.thread_key === selectedThreadKey;
            return (
              <button
                key={session.thread_key}
                type="button"
                onClick={() => onSelect(session)}
                className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                  active
                    ? "border-primary/50 bg-primary/10 shadow-sm ring-2 ring-primary/20"
                    : "border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50/80"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{session.user_name}</p>
                      <p className="truncate text-xs text-slate-500">{session.user_email}</p>
                    </div>
                    <span className="shrink-0 text-right text-[10px] font-medium text-slate-500">
                      <span className="block">{formatDateLabel(session.lastAt)}</span>
                      <span className="tabular-nums">{formatTime(session.lastAt)}</span>
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600">{session.lastMessage}</p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      {session.unread && (
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      )}
                      <span className="text-xs text-slate-500">
                        <MessageSquare className="mr-1 inline h-3 w-3" />
                        {session.messageCount}
                      </span>
                    </div>
                    {session.lastSender === "lawyer" && (
                      <span className="flex items-center gap-1 text-[10px] text-green-600">
                        <CheckCheck className="h-3 w-3" /> Replied
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
