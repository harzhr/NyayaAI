import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import {
  fetchLawyerInboxRows,
  groupLawyerChatsIntoSessions,
  type LawyerChatRowWithUser,
  type LawyerConversationSession,
} from "@/lib/lawyerChats";
import { LawyerConversationList } from "@/components/lawyer/LawyerConversationList";
import { LawyerClientChatPanel } from "@/components/lawyer/LawyerClientChatPanel";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatDateLabel = (value: string) => {
  const d = new Date(value);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return "Today";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(d);
};

export default function LawyerDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LawyerConversationSession[]>([]);
  const [selected, setSelected] = useState<LawyerConversationSession | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const refreshInbox = useCallback(async () => {
    if (user?.role !== "lawyer" || !user.id) {
      setSessions([]);
      setSelected(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { rows, error } = await fetchLawyerInboxRows(user.id);

    if (error) {
      console.error(error);
      toast.error("Could not load conversations.");
      setLoading(false);
      return;
    }

    const next = groupLawyerChatsIntoSessions(rows);
    setSessions(next);

    setSelected((prev) => {
      if (prev) {
        return next.find((s) => s.thread_key === prev.thread_key) ?? null;
      }
      return next[0] ?? null;
    });

    setLoading(false);
  }, [user?.role, user?.id]);

  useEffect(() => {
    refreshInbox();
  }, [refreshInbox]);

  const handleSend = async () => {
    if (!selected || !reply.trim() || !user) {
      return;
    }

    setSending(true);
    const trimmed = reply.trim();

    const { data, error } = await supabase
      .from("lawyer_chats")
      .insert({
        user_id: selected.user_id,
        message: trimmed,
        sender: "lawyer",
        assigned_lawyer_id: user.id,
        demo_lawyer_key: null,
      })
      .select("id,user_id,assigned_lawyer_id,demo_lawyer_key,message,sender,created_at")
      .single();

    if (error || !data) {
      console.error("Lawyer reply insert failed:", error);
      toast.error("Could not send reply.");
      setSending(false);
      return;
    }

    const row: LawyerChatRowWithUser = {
      id: data.id,
      user_id: data.user_id,
      assigned_lawyer_id: data.assigned_lawyer_id,
      demo_lawyer_key: data.demo_lawyer_key,
      message: data.message,
      sender: data.sender as "lawyer",
      created_at: data.created_at,
      user_name: selected.user_name,
      user_email: selected.user_email,
    };

    setReply("");

    setSessions((prev) =>
      prev.map((s) =>
        s.thread_key === selected.thread_key
          ? {
              ...s,
              messages: [...s.messages, row],
              lastMessage: row.message,
              lastAt: row.created_at,
              lastSender: "lawyer",
              unread: false,
              messageCount: s.messageCount + 1,
            }
          : s
      )
    );

    setSelected((prev) =>
      prev && prev.thread_key === selected.thread_key
        ? {
            ...prev,
            messages: [...prev.messages, row],
            lastMessage: row.message,
            lastAt: row.created_at,
            lastSender: "lawyer",
            unread: false,
            messageCount: prev.messageCount + 1,
          }
        : prev
    );

    setSending(false);
  };

  if (user?.role !== "lawyer") {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-3xl font-bold">Lawyer dashboard</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        You only see clients who chose you from the directory. Demo-only threads stay on the user&apos;s account.
      </p>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl border border-border/50 shadow-sm">
          <div className="border-b border-border/50 bg-gradient-to-r from-slate-50 to-transparent px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero text-white">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Inbox</p>
                <h2 className="text-lg font-bold text-slate-900">Clients</h2>
              </div>
            </div>
          </div>

          <LawyerConversationList
            sessions={sessions}
            selectedThreadKey={selected?.thread_key ?? null}
            loading={loading}
            onSelect={setSelected}
            formatTime={formatTime}
            formatDateLabel={formatDateLabel}
          />
        </Card>

        <div className="h-[calc(100vh-10rem)]">
          <LawyerClientChatPanel
            session={selected}
            replyText={reply}
            onReplyChange={setReply}
            onSend={handleSend}
            sending={sending}
            formatTime={formatTime}
          />
        </div>
      </div>
    </div>
  );
}
