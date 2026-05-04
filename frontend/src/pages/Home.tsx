import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  Gavel,
  Languages,
  MessagesSquare,
  Radio,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: MessagesSquare,
    title: "AI Legal Assistant",
    desc: "AI breaks down your legal issue into simple steps you can understand.",
  },
  {
    icon: Sparkles,
    title: "Precision Matching",
    desc: "Find the right lawyer tailored to your exact problem.",
  },
  {
    icon: Gavel,
    title: "Verified Lawyers",
    desc: "Work with trusted professionals with proven experience.",
  },
  {
    icon: Radio,
    title: "Instant Consultation",
    desc: "Chat live with lawyers without waiting.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-subtle">
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Powered Legal Advisor 
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
            AI-powered legal help for everyone.
            <span className="block bg-gradient-hero bg-clip-text">Ab kanoon simple, aur lawyer accessible.</span>
          </h1>

          <p className="mt-6 text-base text-muted-foreground md:text-lg">
            From understanding your rights with AI to finding the perfect lawyer — NyayaAI gives you fast, smart, and reliable legal support.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4">
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button asChild size="lg" className="min-w-[220px] gap-2 shadow-elegant">
                <Link to="/chat">
                  Get Legal Help with AI
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-w-[220px] gap-2">
                <Link to="/lawyer-chat">
                  <Radio className="h-4 w-4" />
                  Start Live Consultation
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="min-w-[220px] gap-2">
                <Link to="/find-lawyer">
                  <Users className="h-4 w-4" />
                  Find Top Lawyers
                </Link>
              </Button>
            </div>

            {!user && (
              <Button asChild size="default" variant="secondary" className="min-w-[220px] gap-2 px-6 py-3">
                <Link to="/signup">Try NyayaAI Free</Link>
              </Button>
            )}
          </div>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            {[
              ["Specialization", "highest priority"],
              ["City + experience", "better local fit"],
              ["Rating", "extra confidence"],
            ].map(([label, text]) => (
              <div key={label} className="rounded-md border bg-background/70 px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl font-bold md:text-3xl mb-4">
            Why NyayaAI Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need for legal help in one place
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className={`h-full p-6 md:p-8 bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-soft transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 flex flex-col justify-between ${
                index === 0 ? 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background' : ''
              }`}
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-24">
        <Card className="overflow-hidden border-0 bg-gradient-hero p-10 text-center text-primary-foreground shadow-elegant md:p-16">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Ask once. Get legal clarity and lawyer options.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            The AI answer stays separate from lawyer recommendations, so you can read the guidance and review matched advocates side by side.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/chat">
                Try smart matching
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/find-lawyer">Browse advocates</Link>
            </Button>
          </div>
        </Card>
      </section>

      {!user && (
        <section className="container mx-auto px-4 py-16">
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-50 to-indigo-50 p-10 text-center shadow-elegant md:p-16 dark:from-blue-950/20 dark:to-indigo-950/20">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Are you a legal professional?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Join NyayaAI so users can discover you through smart matching and message you in realtime.
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
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-background text-lg font-bold">
                  N
                </span>
                <span className="text-xl font-semibold">NyayaAI</span>
              </div>
              <p className="max-w-md text-sm text-slate-400">
                NyayaAI combines AI legal guidance, smart lawyer matching, demo advocate discovery, and realtime lawyer chat
                for Indian users who need a clearer next step.
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
      
      <footer className="w-full mt-10 pb-6">
        <p className="text-xs text-muted-foreground text-center px-4">
          © 2026 NyayaAI. Personal project built for educational and professional exploration. This platform does not provide legal advice.
        </p>
      </footer>
    </div>
  );
}
