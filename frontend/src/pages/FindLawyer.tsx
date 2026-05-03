import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_LAWYERS } from "@/data/demoLawyers";
import { writePersistedConsult } from "@/lib/lawyerConsultStorage";
import { ArrowRight, Building2, Globe2, Landmark, MapPin, MessageCircle, Scale, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchRegisteredLawyersForDirectory, type DirectoryLawyer } from "@/lib/lawyerDirectory";

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const accentByIndex = [
  "from-amber-500/20 via-orange-500/10 to-transparent",
  "from-emerald-500/20 via-teal-500/10 to-transparent",
  "from-sky-500/20 via-indigo-500/10 to-transparent",
  "from-rose-500/20 via-pink-500/10 to-transparent",
  "from-violet-500/20 via-purple-500/10 to-transparent",
];

export default function FindLawyerPage() {
  const navigate = useNavigate();
  const [tag, setTag] = useState<string | null>(null);
  const [registeredLawyers, setRegisteredLawyers] = useState<DirectoryLawyer[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(true);

  useEffect(() => {
    fetchRegisteredLawyersForDirectory().then(({ lawyers, error }) => {
      if (error) {
        console.error("Failed to fetch registered lawyers:", error);
      } else {
        setRegisteredLawyers(lawyers);
      }
      setLoadingRegistered(false);
    });
  }, []);

  const allTags = useMemo(
    () => [...new Set(DEMO_LAWYERS.flatMap((d) => d.tags))].sort((a, b) => a.localeCompare(b)),
    []
  );

  const filtered = useMemo(() => {
    const filteredDemos = tag ? DEMO_LAWYERS.filter((d) => d.tags.includes(tag)) : DEMO_LAWYERS;
    const allLawyers: DirectoryLawyer[] = [
      ...registeredLawyers.map((r) => ({ ...r, kind: "registered" as const })),
      ...filteredDemos.map((d) => ({ ...d, kind: "demo" as const })),
    ];
    return allLawyers;
  }, [tag, registeredLawyers]);

  const startWithDemo = (key: string) => {
    writePersistedConsult({ v: 1, kind: "demo", key });
    navigate("/lawyer-chat");
  };

  const startWithRegistered = (id: string) => {
    navigate(`/lawyer-chat?lawyer=${id}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.25) 0%, transparent 45%),
            radial-gradient(circle at 80% 0%, hsl(280 60% 50% / 0.12) 0%, transparent 40%),
            radial-gradient(circle at 50% 100%, hsl(35 80% 45% / 0.12) 0%, transparent 42%)`,
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full border border-dashed border-primary/20" />
      <div className="pointer-events-none absolute -right-16 bottom-24 h-56 w-56 rounded-full border border-dashed border-primary/15" />

      <div className="container relative mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground shadow-sm backdrop-blur-sm">
            <Landmark className="h-3.5 w-3.5 text-primary" />
            Advocate directory
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Find the right lawyer for your matter
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            Browse independent demo profiles styled like real Indian practice areas—courts, bar councils, and languages.
            Tap an advocate to open a private chat thread (sign in when prompted).
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2 rounded-full px-8 shadow-lg shadow-primary/20">
              <Link to="/lawyer-chat">
                <MessageCircle className="h-4 w-4" />
                Quick chat (all lawyers)
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full gap-2 border-primary/30">
              <Link to="/chat">
                <Scale className="h-4 w-4" />
                AI legal assistant
              </Link>
            </Button>
          </div>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            { n: String(DEMO_LAWYERS.length + registeredLawyers.length), label: "Total advocates", sub: "Demo + registered" },
            {
              n: String(allTags.length),
              label: "Practice filters",
              sub: "Tap a tag to narrow down",
            },
            { n: "1:1", label: "Private threads", sub: "Tied to your account" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card/60 p-5 text-center shadow-sm backdrop-blur-sm"
            >
              <p className="font-display text-3xl font-bold text-primary">{s.n}</p>
              <p className="mt-1 font-semibold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </section>

        <section className="mb-6">
          <p className="mb-3 text-center text-sm font-medium text-muted-foreground">Filter demo profiles by practice area</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setTag(null)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                tag === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted/80"
              )}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t === tag ? null : t)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  tag === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted/80"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((lawyer, i) => {
            const isDemo = lawyer.kind === "demo";
            const displayName = lawyer.name.startsWith("Adv.") ? lawyer.name : `Adv. ${lawyer.name}`;
            const spec = lawyer.specialization;
            const exp = lawyer.experience;
            const loc = lawyer.location;
            const langs = lawyer.languages?.join(" · ") ?? null;
            const bio = lawyer.bio;

            return (
              <article
                key={isDemo ? `demo-${lawyer.key}` : lawyer.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl"
              >
                <div
                  className={cn(
                    "h-28 bg-gradient-to-br px-6 py-5",
                    accentByIndex[i % accentByIndex.length]
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/90 text-lg font-bold text-primary shadow-sm ring-2 ring-primary/10">
                        {initials(lawyer.name)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary/90">Advocate</p>
                        <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">{displayName}</h2>
                        {isDemo && "title" in lawyer && (
                          <p className="text-sm text-muted-foreground">{lawyer.title}</p>
                        )}
                      </div>
                    </div>
                    {isDemo ? (
                      <Badge variant="secondary" className="shrink-0 gap-1 bg-background/80 backdrop-blur">
                        <Sparkles className="h-3 w-3" /> Demo profile
                      </Badge>
                    ) : (
                      <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600">On NyayaAI</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-6">
                  <p className="font-medium leading-snug text-foreground">{spec}</p>
                  {isDemo && "tags" in lawyer && (
                    <div className="flex flex-wrap gap-2">
                      {lawyer.tags.map((tg) => (
                        <span
                          key={tg}
                          className="rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {tg}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{bio}</p>

                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {loc && (
                      <li className="flex gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{loc}</span>
                      </li>
                    )}
                    {isDemo && "courts" in lawyer && (
                      <li className="flex gap-2">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{lawyer.courts}</span>
                      </li>
                    )}
                    {isDemo && "barCouncil" in lawyer && (
                      <li className="flex gap-2">
                        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{lawyer.barCouncil}</span>
                      </li>
                    )}
                    {langs && exp && (
                      <li className="flex gap-2">
                        <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{langs} · {exp} practice</span>
                      </li>
                    )}
                  </ul>

                  <Button
                    type="button"
                    size="lg"
                    className="mt-auto w-full gap-2 rounded-2xl"
                    variant={isDemo ? "default" : "secondary"}
                    onClick={() =>
                      isDemo ? startWithDemo(lawyer.key) : startWithRegistered(lawyer.id)
                    }
                  >
                    Start conversation
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">No advocates match this tag. Clear filters above.</p>
        )}

        <footer className="mt-14 rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          <p>
            Browse both <strong className="text-foreground">registered NyayaAI lawyers</strong> and illustrative demo profiles.
            Start a private chat thread with any advocate (sign in when prompted).
          </p>
        </footer>
      </div>
    </div>
  );
}
