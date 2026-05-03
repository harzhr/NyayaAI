import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { MessageSquare, Trash2, ArrowRight, LogOut } from "lucide-react";
import { toast } from "sonner";

type ChatHistory = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
};

export default function Dashboard() {
  const { user, loading, updateProfile, logout } = useAuth();
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [name, setName] = useState(user?.name ?? "");

  // Fetch chat history from Supabase
  useEffect(() => {
    if (user) {
      setName(user.name);
      fetchChats();
    }
  }, [user?.id]);

  const fetchChats = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching chats:", error);
    } else {
      setChats(data || []);
    }
  };

  const deleteChat = async (id: string) => {
    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Could not delete chat");
    } else {
      setChats(chats.filter((c) => c.id !== id));
      toast.success("Chat deleted");
    }
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    try {
      await updateProfile({ name: trimmed });
    } catch {
      toast.error("Could not update profile");
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const uniqueQuestions = new Set(chats.map((c) => c.question)).size;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Namaste, {user.name}</h1>
          <p className="text-sm text-muted-foreground">Your legal conversations and profile, all in one place.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Conversations</p>
          <p className="mt-2 font-display text-3xl font-bold">{uniqueQuestions}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total messages</p>
          <p className="mt-2 font-display text-3xl font-bold">{chats.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Preferred language</p>
          <p className="mt-2 font-display text-3xl font-bold">{user.language === "hi" ? "हिंदी" : "English"}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Chat history */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Chat history</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/chat" className="gap-2">New chat <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          {chats.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No conversations yet. <Link to="/chat" className="text-primary hover:underline">Start one</Link>.
            </div>
          ) : (
            <ul className="divide-y max-h-96 overflow-y-auto">
              {chats.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.question.slice(0, 60)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()} · {new Date(c.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteChat(c.id)} aria-label="Delete chat">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Profile */}
        <Card className="h-fit p-5">
          <h2 className="font-display text-xl font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Preferred language</Label>
              <Tabs value={user.language} onValueChange={(v) => updateProfile({ language: v as "en" | "hi" })}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिंदी</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button onClick={saveName} className="w-full">Save changes</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}


