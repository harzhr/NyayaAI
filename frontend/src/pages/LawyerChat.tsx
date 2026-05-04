import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { fetchLawyerThreadForUser, type LawyerChatRow, type ThreadFilter } from "@/lib/lawyerChats";
import { UserLawyerConsultChat } from "@/components/lawyer/UserLawyerConsultChat";
import { LawyerPickerGrid } from "@/components/lawyer/LawyerPickerGrid";
import {
  buildLawyerDirectoryList,
  fetchRegisteredLawyersForDirectory,
  getDemoLawyer,
  type DirectoryLawyer,
} from "@/lib/lawyerDirectory";
import {
  readPersistedConsult,
  writePersistedConsult,
  type PersistedConsult,
} from "@/lib/lawyerConsultStorage";
import { toast } from "sonner";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSameThread(row: LawyerChatRow, filter: ThreadFilter) {
  if (filter.type === "live") {
    return row.assigned_lawyer_id === filter.assignedLawyerId && row.demo_lawyer_key === null;
  }

  return row.demo_lawyer_key === filter.demoLawyerKey && row.assigned_lawyer_id === null;
}

function appendMessage(messages: LawyerChatRow[], row: LawyerChatRow) {
  if (messages.some((message) => message.id === row.id)) {
    return messages;
  }

  return [...messages, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export default function LawyerChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [directory, setDirectory] = useState<DirectoryLawyer[]>([]);
  const [dirLoading, setDirLoading] = useState(true);
  const [consult, setConsult] = useState<PersistedConsult | null>(() => readPersistedConsult());
  const [messages, setMessages] = useState<LawyerChatRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const demo = searchParams.get("demo");
    const live = searchParams.get("lawyer");
    let applied = false;

    if (demo && getDemoLawyer(demo)) {
      const next: PersistedConsult = { v: 1, kind: "demo", key: demo };
      setConsult(next);
      writePersistedConsult(next);
      applied = true;
    } else if (live && uuidRe.test(live)) {
      const next: PersistedConsult = { v: 1, kind: "live", lawyerId: live };
      setConsult(next);
      writePersistedConsult(next);
      applied = true;
    }

    if (applied) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDirLoading(true);
      const { lawyers, error } = await fetchRegisteredLawyersForDirectory();
      if (cancelled) return;
      if (error) {
        toast.error("Could not load lawyer directory.");
      }
      setDirectory(buildLawyerDirectoryList(lawyers));
      setDirLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const threadFilter: ThreadFilter | null = useMemo(() => {
    if (!consult) return null;
    if (consult.kind === "live") {
      return { type: "live", assignedLawyerId: consult.lawyerId };
    }
    return { type: "demo", demoLawyerKey: consult.key };
  }, [consult]);

  const consultMeta = useMemo(() => {
    if (!consult) return null;
    if (consult.kind === "demo") {
      const d = getDemoLawyer(consult.key);
      return {
        title: d ? `Adv. ${d.name}` : "Demo advocate",
        subtitle: d?.specialization ?? "",
        isDemo: true,
      };
    }
    const live = directory.find((l) => l.kind === "registered" && l.id === consult.lawyerId);
    if (live && live.kind === "registered") {
      return {
        title: live.name,
        subtitle: live.specialization ?? "",
        isDemo: false,
      };
    }
    return { title: "Your lawyer", subtitle: "", isDemo: false };
  }, [consult, directory]);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !threadFilter) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { messages: rows, error } = await fetchLawyerThreadForUser(user.id, threadFilter);
    if (error) {
      console.error(error);
      toast.error("Could not load messages.");
      setMessages([]);
    } else {
      setMessages(rows);
    }
    setLoading(false);
  }, [user?.id, threadFilter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!user?.id || !threadFilter) {
      return;
    }

    const channel = supabase
      .channel(`lawyer-chat-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lawyer_chats",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as LawyerChatRow;
          if (isSameThread(row, threadFilter)) {
            setMessages((prev) => appendMessage(prev, row));
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[LawyerChat] realtime subscription error");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, threadFilter]);

  const selectRegistered = (lawyerId: string) => {
    const next: PersistedConsult = { v: 1, kind: "live", lawyerId };
    setConsult(next);
    writePersistedConsult(next);
  };

  const selectDemo = (key: string) => {
    const next: PersistedConsult = { v: 1, kind: "demo", key };
    setConsult(next);
    writePersistedConsult(next);
  };

  const clearConsult = () => {
    setConsult(null);
    writePersistedConsult(null);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || !user?.id || sending || !consult) {
      return;
    }

    setSending(true);
    const text = input.trim();
    setInput("");

    const rowPayload =
      consult.kind === "live"
        ? {
            user_id: user.id,
            message: text,
            sender: "user" as const,
            assigned_lawyer_id: consult.lawyerId,
            demo_lawyer_key: null as string | null,
          }
        : {
            user_id: user.id,
            message: text,
            sender: "user" as const,
            assigned_lawyer_id: null as string | null,
            demo_lawyer_key: consult.key,
          };

    const { data, error } = await supabase.from("lawyer_chats").insert(rowPayload).select("*").single();

    if (error || !data) {
      console.error("Failed to send message:", error);
      toast.error("Message could not be sent.");
      setSending(false);
      return;
    }

    setMessages((prev) => appendMessage(prev, data as LawyerChatRow));
    setSending(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Lawyer connect</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Talk to a legal expert</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Choose a registered NyayaAI lawyer or a demo profile, then send messages in a private thread tied to your
            account. Browse richer profiles on{" "}
            <Link to="/find-lawyer" className="font-medium text-primary underline-offset-4 hover:underline">
              Find a lawyer
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/find-lawyer">Find a lawyer</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/chat">
              <ArrowLeft className="h-4 w-4" /> Back to AI chat
            </Link>
          </Button>
          {consult && (
            <Button type="button" variant="outline" size="sm" onClick={clearConsult}>
              Change lawyer
            </Button>
          )}
          {consult && (
            <Button type="button" onClick={loadMessages} variant="outline" size="sm" className="gap-2">
              <Send className="h-4 w-4" /> Refresh
            </Button>
          )}
        </div>
      </div>

      {!consult ? (
        <LawyerPickerGrid
          lawyers={directory}
          loading={dirLoading}
          onSelectRegistered={selectRegistered}
          onSelectDemo={selectDemo}
        />
      ) : (
        <UserLawyerConsultChat
          messages={messages}
          loading={loading}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          sending={sending}
          canSend={!!user}
          onKeyDown={handleKeyDown}
          consultSubtitle={
            consultMeta ? `${consultMeta.title}${consultMeta.subtitle ? ` · ${consultMeta.subtitle}` : ""}` : undefined
          }
          isDemoConsult={consultMeta?.isDemo ?? false}
        />
      )}
    </div>
  );
}
