import { supabase } from "@/lib/supabase";

export type LawyerChatSender = "user" | "lawyer";

export type LawyerChatRow = {
  id: string;
  user_id: string;
  assigned_lawyer_id: string | null;
  demo_lawyer_key: string | null;
  message: string;
  sender: LawyerChatSender;
  created_at: string;
};

export type LawyerChatRowWithUser = LawyerChatRow & {
  user_name: string;
  user_email: string;
};

export type LawyerConversationSession = {
  thread_key: string;
  user_id: string;
  user_name: string;
  user_email: string;
  assigned_lawyer_id: string | null;
  demo_lawyer_key: string | null;
  lastMessage: string;
  lastAt: string;
  lastSender: LawyerChatSender;
  unread: boolean;
  messageCount: number;
  messages: LawyerChatRowWithUser[];
};

export function lawyerThreadKey(row: Pick<LawyerChatRow, "user_id" | "assigned_lawyer_id" | "demo_lawyer_key">): string {
  if (row.assigned_lawyer_id) {
    return `${row.user_id}::live::${row.assigned_lawyer_id}`;
  }
  if (row.demo_lawyer_key) {
    return `${row.user_id}::demo::${row.demo_lawyer_key}`;
  }
  return `${row.user_id}::legacy`;
}

/** Fetch rows for the signed-in lawyer's inbox only. */
export async function fetchLawyerInboxRows(lawyerProfileId: string): Promise<{
  rows: LawyerChatRowWithUser[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("lawyer_chats")
    .select("id,user_id,assigned_lawyer_id,demo_lawyer_key,message,sender,created_at")
    .eq("assigned_lawyer_id", lawyerProfileId)
    .is("demo_lawyer_key", null)
    .order("created_at", { ascending: true });

  if (error) {
    return { rows: [], error: new Error(error.message) };
  }

  const base = (data ?? []) as LawyerChatRow[];
  const userIds = [...new Set(base.map((r) => r.user_id))];

  if (userIds.length === 0) {
    return { rows: [], error: null };
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,email")
    .in("id", userIds);

  if (profileError) {
    return { rows: [], error: new Error(profileError.message) };
  }

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { name: p.name ?? "Unknown", email: p.email ?? "" },
    ])
  );

  const rows: LawyerChatRowWithUser[] = base.map((row) => {
    const p = profileMap.get(row.user_id);
    return {
      ...row,
      user_name: p?.name ?? "Unknown user",
      user_email: p?.email ?? "—",
    };
  });

  return { rows, error: null };
}

export function groupLawyerChatsIntoSessions(rows: LawyerChatRowWithUser[]): LawyerConversationSession[] {
  const map = new Map<string, LawyerConversationSession>();

  for (const row of rows) {
    const tk = lawyerThreadKey(row);
    const existing = map.get(tk);
    const msg: LawyerChatRowWithUser = { ...row };

    if (!existing) {
      map.set(tk, {
        thread_key: tk,
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        assigned_lawyer_id: row.assigned_lawyer_id,
        demo_lawyer_key: row.demo_lawyer_key,
        lastMessage: row.message,
        lastAt: row.created_at,
        lastSender: row.sender,
        unread: row.sender === "user",
        messageCount: 1,
        messages: [msg],
      });
      continue;
    }

    existing.messages.push(msg);
    existing.lastMessage = row.message;
    existing.lastAt = row.created_at;
    existing.lastSender = row.sender;
    existing.unread = row.sender === "user";
    existing.messageCount = existing.messages.length;
    existing.user_name = row.user_name;
    existing.user_email = row.user_email;
  }

  return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export type ThreadFilter =
  | { type: "live"; assignedLawyerId: string }
  | { type: "demo"; demoLawyerKey: string };

export async function fetchLawyerThreadForUser(
  userId: string,
  filter: ThreadFilter
): Promise<{ messages: LawyerChatRow[]; error: Error | null }> {
  let q = supabase
    .from("lawyer_chats")
    .select("id,user_id,assigned_lawyer_id,demo_lawyer_key,message,sender,created_at")
    .eq("user_id", userId);

  if (filter.type === "live") {
    q = q.eq("assigned_lawyer_id", filter.assignedLawyerId).is("demo_lawyer_key", null);
  } else {
    q = q.eq("demo_lawyer_key", filter.demoLawyerKey).is("assigned_lawyer_id", null);
  }

  const { data, error } = await q.order("created_at", { ascending: true });

  if (error) {
    return { messages: [], error: new Error(error.message) };
  }

  return { messages: (data ?? []) as LawyerChatRow[], error: null };
}
