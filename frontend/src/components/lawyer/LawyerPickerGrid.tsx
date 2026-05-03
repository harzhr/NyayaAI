import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Scale, Sparkles } from "lucide-react";
import type { DirectoryLawyer } from "@/lib/lawyerDirectory";

type Props = {
  lawyers: DirectoryLawyer[];
  loading: boolean;
  onSelectRegistered: (id: string) => void;
  onSelectDemo: (key: string) => void;
};

export function LawyerPickerGrid({ lawyers, loading, onSelectRegistered, onSelectDemo }: Props) {
  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (lawyers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
        No lawyers are listed yet. Demo advocates below will still appear once data loads.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lawyers.map((lawyer) => {
        const isDemo = lawyer.kind === "demo";
        const displayName = lawyer.name.startsWith("Adv.") ? lawyer.name : `Adv. ${lawyer.name}`;
        const spec = lawyer.specialization;
        const exp = lawyer.experience;
        const loc = lawyer.location;
        const langs = lawyer.languages?.join(" · ") ?? null;
        const bio = lawyer.bio;

        return (
          <Card
            key={isDemo ? `demo-${lawyer.key}` : lawyer.id}
            className="flex flex-col overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="border-b border-border/60 bg-gradient-to-br from-primary/5 to-transparent px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight text-foreground">{displayName}</p>
                    {isDemo && "title" in lawyer && (
                      <p className="truncate text-[11px] font-medium text-primary/90">{lawyer.title}</p>
                    )}
                    <p className="line-clamp-2 text-xs text-muted-foreground">{spec}</p>
                  </div>
                </div>
                {isDemo ? (
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Sparkles className="h-3 w-3" /> Demo
                  </Badge>
                ) : (
                  <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600">On NyayaAI</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{exp}</span>
                {loc && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {loc}
                  </span>
                )}
              </div>
              {langs && <p className="text-xs text-muted-foreground">Languages: {langs}</p>}
              {bio && <p className="line-clamp-3 text-xs leading-relaxed text-foreground/85">{bio}</p>}
              <Button
                type="button"
                className="mt-auto w-full"
                variant={isDemo ? "secondary" : "default"}
                onClick={() =>
                  isDemo ? onSelectDemo(lawyer.key) : onSelectRegistered(lawyer.id)
                }
              >
                Chat with {displayName.replace(/^Adv\.\s*/i, "").split(" ").slice(-1)[0] ?? "lawyer"}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
