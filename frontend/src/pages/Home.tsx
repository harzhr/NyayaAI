import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scale, MessagesSquare, ShieldCheck, Languages, BookOpen, ArrowRight, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: MessagesSquare, title: "Conversational Legal Help", desc: "Ask anything about Indian law in plain English or हिंदी." },
  { icon: BookOpen, title: "Relevant Acts & Sections", desc: "Get pointers to the laws and sections that apply to your situation." },
  { icon: Languages, title: "Hindi & English", desc: "Bilingual answers tailored to how you ask." },
  { icon: ShieldCheck, title: "Private & Secure", desc: "Your chats are stored against your account, never shared." },
];

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-subtle">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Scale className="h-3.5 w-3.5 text-primary" />
            AI-powered legal guidance for India
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
            Understand the law.
            <span className="block bg-gradient-hero bg-clip-text">Apni language mein, bina stress ke.</span>
          </h1>
          <p className="mt-6 text-base text-muted-foreground md:text-lg">
            NyayaAI explains Indian laws, suggests relevant Acts, and walks you through next steps —
            in simple Hindi and English. A helpful first stop, not a substitute for a lawyer.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4">
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button asChild size="lg" className="min-w-[220px] gap-2 shadow-elegant">
                <Link to="/chat">
                  {user ? "Continue chatting" : "Ask your legal question"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-w-[220px] gap-2">
                <Link to="/lawyer-chat">Consult a lawyer <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="min-w-[220px] gap-2">
                <Link to="/find-lawyer">
                  <Users className="h-4 w-4" /> Browse advocates
                </Link>
              </Button>
            </div>

            {!user && (
              <Button asChild size="md" variant="secondary" className="min-w-[220px] gap-2 px-6 py-3">
                <Link to="/signup">Get started for free</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6 shadow-soft transition-shadow hover:shadow-elegant">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <Card className="overflow-hidden border-0 bg-gradient-hero p-10 text-center text-primary-foreground shadow-elegant md:p-16">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Have a legal question?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Get a clear, friendly explanation in seconds. Always remember to consult a qualified advocate for important matters.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
            <Link to="/chat">Ask NyayaAI <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>

      {/* Lawyer Section */}
      {!user && (
        <section className="container mx-auto px-4 py-16">
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-50 to-indigo-50 p-10 text-center shadow-elegant md:p-16 dark:from-blue-950/20 dark:to-indigo-950/20">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Are you a legal professional?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Join our network of qualified lawyers and help users with their legal questions.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="min-w-[200px] gap-2">
                <Link to="/lawyer-signup">Register as a lawyer</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-w-[200px] gap-2">
                <Link to="/lawyer-login">Lawyer Login</Link>
              </Button>
            </div>
          </Card>
        </section>
      )}

      <footer className="border-t border-border/70 bg-slate-950/95 text-slate-200">
        <div className="container mx-auto px-4 py-16">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-background text-lg font-bold">N</span>
                <span className="text-xl font-semibold">NyayaAI</span>
              </div>
              <p className="max-w-md text-sm text-slate-400">
                NyayaAI is a legal assistant for Indian users, combining AI guidance with access to verified lawyer consultations.
                It helps you understand law, find relevant sections, and connect to advocacy when needed.
              </p>
              <p className="text-xs text-slate-500">AI guidance is informative only and does not replace professional legal advice.</p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Navigation</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li>
                  <Link to="/" className="transition-colors hover:text-white">Home</Link>
                </li>
                <li>
                  <Link to="/chat" className="transition-colors hover:text-white">AI Legal Assistant</Link>
                </li>
                <li>
                  <Link to="/find-lawyer" className="transition-colors hover:text-white">Browse Advocates</Link>
                </li>
                <li>
                  <Link to={user ? "/lawyer-chat" : "/login"} className="transition-colors hover:text-white">Sign In</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Legal & Support</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li>
                  <Link to="/" className="transition-colors hover:text-white">Help Center</Link>
                </li>
                <li>
                  <Link to="/" className="transition-colors hover:text-white">Contact Support</Link>
                </li>
                <li>
                  <Link to="/" className="transition-colors hover:text-white">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/" className="transition-colors hover:text-white">Terms of Use</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
