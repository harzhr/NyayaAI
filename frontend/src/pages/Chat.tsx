import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Plus, Scale, Loader2, MessageSquare, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

export type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
export type Chat = { id: string; title: string; messages: Message[]; created_at: string };

async function getAssistantReply(userText: string, language: "en" | "hi"): Promise<string> {
  const systemPrompt =
    language === "hi"
      ? `You are a legal assistant for India. Provide accurate, helpful information about Indian laws, rights, and legal procedures in Hindi. Always include a disclaimer that you are not a lawyer and important matters require professional legal advice. Be concise but thorough.`
      : `You are a legal assistant for India. Provide accurate, helpful information about Indian laws, rights, and legal procedures in English. Always include a disclaimer that you are not a lawyer and important matters require professional legal advice. Be concise but thorough.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
}

async function saveChatToSupabase(userId: string, question: string, answer: string): Promise<boolean> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session || session.user.id !== userId) {
      return false;
    }

    const { error } = await supabase.from("chats").insert({ user_id: userId, question, answer }).select();
    if (error) {
      console.error("chats insert:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchChatHistory(userId: string): Promise<Chat[]> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return [];
    }

    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("chats fetch:", error.message);
      return [];
    }

    const grouped = new Map<string, Chat>();
    data?.forEach((chat) => {
      const date = new Date(chat.created_at).toLocaleDateString();
      if (!grouped.has(date)) {
        grouped.set(date, {
          id: date,
          title: chat.question.slice(0, 40),
          messages: [],
          created_at: chat.created_at,
        });
      }
      const existing = grouped.get(date)!;
      existing.messages.push(
        { id: `${chat.id}-q`, role: "user", content: chat.question, createdAt: chat.created_at },
        { id: `${chat.id}-a`, role: "assistant", content: chat.answer, createdAt: chat.created_at }
      );
    });

    return Array.from(grouped.values());
  } catch {
    return [];
  }
}

export default function ChatPage() {
  const { user, loading: userLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id && !userLoading) {
      setFetchingHistory(true);
      fetchChatHistory(user.id).then((history) => {
        setChats(history);
        if (history.length > 0) {
          setActiveId(history[0].id);
        }
        setFetchingHistory(false);
      });
    }
  }, [user?.id, userLoading]);

  useEffect(() => {
    if (user?.language) {
      setLanguage(user.language);
    }
  }, [user?.language]);

  const active = useMemo(() => chats.find((c) => c.id === activeId) ?? null, [chats, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, loading]);

  const refreshChats = async () => {
    if (!user?.id) return;
    setFetchingHistory(true);
    const history = await fetchChatHistory(user.id);
    setChats(history);
    setFetchingHistory(false);
  };

  const startNew = () => {
    const newChatObj: Chat = {
      id: crypto.randomUUID(),
      title: "New conversation",
      messages: [],
      created_at: new Date().toISOString(),
    };
    setChats([newChatObj, ...chats]);
    setActiveId(newChatObj.id);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !user) return;

    let chat = active;
    let list = chats;
    if (!chat) {
      chat = {
        id: crypto.randomUUID(),
        title: text.slice(0, 40),
        messages: [],
        created_at: new Date().toISOString(),
      };
      list = [chat, ...chats];
      setActiveId(chat.id);
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const updated: Chat = {
      ...chat,
      title: chat.messages.length === 0 ? text.slice(0, 40) : chat.title,
      messages: [...chat.messages, userMsg],
    };
    let next = list.map((c) => (c.id === updated.id ? updated : c));
    if (!list.find((c) => c.id === updated.id)) next = [updated, ...next];
    setChats(next);
    setInput("");
    setLoading(true);

    try {
      const reply = await getAssistantReply(text, language);
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString(),
      };
      const withReply = next.map((c) =>
        c.id === updated.id ? { ...c, messages: [...c.messages, aiMsg] } : c
      );
      setChats(withReply);
      await saveChatToSupabase(user.id, text, reply);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="container mx-auto grid h-[calc(100vh-3.5rem)] max-w-6xl grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr]">
      <Card className="hidden flex-col overflow-hidden lg:flex">
        <div className="border-b p-3">
          <Button onClick={startNew} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {fetchingHistory && (
              <p className="flex items-center justify-center gap-2 px-2 py-6 text-center text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading chats...
              </p>
            )}
            {!fetchingHistory && chats.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No conversations yet</p>
            )}
            {chats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                  c.id === activeId ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{c.title || "Untitled"}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">NyayaAI Assistant</p>
              <p className="text-[11px] text-muted-foreground">Informational only — not legal advice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Tabs value={language} onValueChange={(v) => setLanguage(v as "en" | "hi")}>
                <TabsList className="h-8">
                  <TabsTrigger value="en" className="h-6 text-xs">
                    English
                  </TabsTrigger>
                  <TabsTrigger value="hi" className="h-6 text-xs">
                    हिंदी
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link to="/lawyer-chat">Talk to Lawyer</Link>
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gradient-subtle">
          <div className="mx-auto max-w-2xl space-y-4 p-4">
            {userLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : !user ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold">Sign in to save chats</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  You need to be signed in to save and access your chat history.
                </p>
                <Link to="/login">
                  <Button className="mt-4">Sign in</Button>
                </Link>
              </div>
            ) : !active || active.messages.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Scale className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold">How can I help you today?</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Ask about consumer rights, RTI, property disputes, FIRs, contracts, or other Indian legal topics.
                </p>
              </div>
            ) : (
              active.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-soft ${
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm border bg-card text-card-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t bg-background p-3">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                !user ? "Sign in to chat" : language === "hi" ? "अपना कानूनी प्रश्न लिखें…" : "Type your legal question…"
              }
              rows={1}
              disabled={!user || loading}
              className="min-h-[44px] resize-none"
            />
            <Button onClick={send} disabled={loading || !input.trim() || !user} size="icon" className="h-11 w-11 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-muted-foreground">
            NyayaAI provides general legal information. For binding advice, consult a licensed advocate.
          </p>
        </div>
      </Card>
    </div>
  );
}
