import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { writePersistedConsult } from "@/lib/lawyerConsultStorage";
import { matchLawyers, type LawyerMatch } from "@/lib/lawyerMatching";
import type { DirectoryLawyer } from "@/lib/lawyerDirectory";
import { MessageCircle, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  query: string;
  lawyers: DirectoryLawyer[];
  loading?: boolean;
};

function formatRating(value: number | null) {
  return value ? value.toFixed(1) : "New";
}

function startConsult(lawyer: LawyerMatch) {
  if (lawyer.kind === "registered") {
    writePersistedConsult({ v: 1, kind: "live", lawyerId: lawyer.id });
    return;
  }

  writePersistedConsult({ v: 1, kind: "demo", key: lawyer.key });
}

function chatPath(lawyer: LawyerMatch) {
  return lawyer.kind === "registered"
    ? `/lawyer-chat?lawyer=${lawyer.id}`
    : `/lawyer-chat?demo=${lawyer.key}`;
}

function lawyerReactKey(lawyer: LawyerMatch) {
  return lawyer.kind === "registered" ? `registered-${lawyer.id}` : `demo-${lawyer.key}`;
}

export function RecommendedLawyers({ query, lawyers, loading = false }: Props) {
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<"score" | "rating" | "experience">("score");

  const matches = useMemo(() => {
    const ranked = matchLawyers(query, lawyers, {
      location,
      minRating,
      limit: 5,
    });

    if (sort === "rating") {
      return [...ranked].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    if (sort === "experience") {
      return [...ranked].sort((a, b) => {
        const aYears = Number(String(a.experience ?? "").match(/\d+/)?.[0] ?? 0);
        const bYears = Number(String(b.experience ?? "").match(/\d+/)?.[0] ?? 0);
        return bYears - aYears;
      });
    }

    return ranked;
  }, [lawyers, location, minRating, query, sort]);

  if (!query.trim()) {
    return null;
  }

  return (
    <Card className="flex max-h-full flex-col overflow-hidden border-primary/20 bg-card p-4 shadow-soft">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Recommended Lawyers</h2>
            {matches[0] && (
              <Badge variant="secondary" className="gap-1">
                {matches[0].matchedCategory}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked from your question and AI answer keywords.
          </p>
        </div>

        <div className="grid gap-2">
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City"
            className="h-9 text-xs"
          />
          <select
            value={minRating}
            onChange={(event) => setMinRating(Number(event.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Minimum rating"
          >
            <option value={0}>Any rating</option>
            <option value={3}>3+ stars</option>
            <option value={4}>4+ stars</option>
            <option value={4.5}>4.5+ stars</option>
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as "score" | "rating" | "experience")}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Sort recommended lawyers"
          >
            <option value="score">Best match</option>
            <option value="rating">Rating</option>
            <option value="experience">Experience</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="py-4 text-sm text-muted-foreground">Finding lawyers...</p>
      ) : matches.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          No matching lawyers found. Try a broader location or lower rating.
        </div>
      ) : (
        <div className="grid gap-3 overflow-y-auto pr-1">
          {matches.slice(0, 5).map((lawyer, index) => (
            <article
              key={lawyerReactKey(lawyer)}
              className="rounded-lg border border-border/70 bg-background p-3"
            >
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium leading-tight">{lawyer.name}</h3>
                    {index === 0 && <Badge className="bg-emerald-600 hover:bg-emerald-600">Best Match</Badge>}
                    {lawyer.kind === "demo" && <Badge variant="secondary">Demo profile</Badge>}
                    <Badge variant="outline">Score {Math.round(lawyer.score)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lawyer.specialization ?? "General practice"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lawyer.experience ?? "Experience not listed"} · {lawyer.location ?? "Location not listed"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lawyer.reasons.slice(0, 3).map((reason) => (
                      <Badge key={reason} variant="secondary" className="text-[10px]">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-sm font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {formatRating(lawyer.rating)}
                  </span>
                  <Button asChild size="sm" className="gap-2" onClick={() => startConsult(lawyer)}>
                    <Link to={chatPath(lawyer)}>
                      <MessageCircle className="h-4 w-4" />
                      Chat Now
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
