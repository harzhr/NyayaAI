import type { DirectoryLawyer } from "@/lib/lawyerDirectory";

export type LegalCategory =
  | "family law"
  | "civil law"
  | "criminal law"
  | "property law"
  | "consumer law"
  | "labour law"
  | "tax law"
  | "intellectual property"
  | "corporate law"
  | "accident claims"
  | "general law";

export type LawyerMatch = DirectoryLawyer & {
  score: number;
  matchedCategory: LegalCategory;
  reasons: string[];
  rating: number | null;
};

export type LawyerMatchOptions = {
  location?: string;
  minRating?: number;
  limit?: number;
};

const CATEGORY_KEYWORDS: Array<{
  category: LegalCategory;
  specialization: string;
  keywords: string[];
}> = [
  {
    category: "family law",
    specialization: "family matrimonial divorce maintenance domestic violence child custody",
    keywords: ["divorce", "marriage", "matrimonial", "maintenance", "alimony", "custody", "domestic violence", "dowry"],
  },
  {
    category: "criminal law",
    specialization: "criminal bail trial fir theft assault ipc crpc",
    keywords: ["theft", "fir", "bail", "arrest", "criminal", "assault", "police", "ipc", "cheating"],
  },
  {
    category: "property law",
    specialization: "property real estate rera land possession tenant landlord",
    keywords: ["property", "land", "rera", "builder", "possession", "tenant", "landlord", "rent", "flat"],
  },
  {
    category: "consumer law",
    specialization: "consumer refund deficiency service product complaint",
    keywords: ["consumer", "refund", "defective", "service", "warranty", "complaint", "ecommerce"],
  },
  {
    category: "labour law",
    specialization: "labour employment industrial posh termination salary workplace",
    keywords: ["job", "employment", "salary", "termination", "workplace", "posh", "labour", "employee"],
  },
  {
    category: "tax law",
    specialization: "tax gst income tax indirect tax assessment",
    keywords: ["gst", "tax", "income tax", "it notice", "assessment", "input tax credit"],
  },
  {
    category: "intellectual property",
    specialization: "intellectual property trademark copyright patent technology contract",
    keywords: ["trademark", "copyright", "patent", "startup", "software", "ip", "licensing"],
  },
  {
    category: "corporate law",
    specialization: "corporate company insolvency ibc banking contract nclt",
    keywords: ["company", "contract", "nclt", "ibc", "insolvency", "debt", "banking", "sarfaesi"],
  },
  {
    category: "accident claims",
    specialization: "motor accident insurance mact compensation injury",
    keywords: ["accident", "insurance", "mact", "compensation", "injury", "vehicle"],
  },
  {
    category: "civil law",
    specialization: "civil dispute recovery cheque dishonour ni act injunction",
    keywords: ["civil", "recovery", "cheque", "notice", "injunction", "dispute", "money"],
  },
];

const matchCache = new Map<string, LawyerMatch[]>();

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function parseYears(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const match = String(value ?? "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function getCity(value: string | null | undefined): string {
  return normalize(value).split(",")[0]?.trim() ?? "";
}

export function extractLegalCategory(userQuery: string): LegalCategory {
  const query = normalize(userQuery);
  const match = CATEGORY_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => query.includes(keyword))
  );
  return match?.category ?? "general law";
}

function categorySpecialization(category: LegalCategory): string {
  return CATEGORY_KEYWORDS.find((item) => item.category === category)?.specialization ?? "";
}

function lawyerKey(lawyer: DirectoryLawyer): string {
  return lawyer.kind === "registered" ? `registered:${lawyer.id}` : `demo:${lawyer.key}`;
}

function lawyerRating(lawyer: DirectoryLawyer): number {
  return lawyer.kind === "registered" ? lawyer.rating ?? 0 : 0;
}

export function matchLawyers(
  userQuery: string,
  lawyers: DirectoryLawyer[],
  options: LawyerMatchOptions = {}
): LawyerMatch[] {
  const limit = options.limit ?? 5;
  const cacheKey = JSON.stringify({
    q: normalize(userQuery),
    ids: lawyers.map((lawyer) => `${lawyerKey(lawyer)}:${lawyerRating(lawyer)}`).join("|"),
    location: normalize(options.location),
    minRating: options.minRating ?? 0,
    limit,
  });

  const cached = matchCache.get(cacheKey);
  if (cached) return cached;

  const category = extractLegalCategory(userQuery);
  const wantedSpecialization = categorySpecialization(category);
  const preferredCity = getCity(options.location);

  const matches = lawyers
    .filter((lawyer) => (options.minRating ? lawyerRating(lawyer) >= options.minRating : true))
    .map<LawyerMatch>((lawyer) => {
      const specialization = normalize(lawyer.specialization);
      const city = getCity(lawyer.location);
      const years = parseYears(lawyer.experience);
      const rating = lawyerRating(lawyer);
      const reasons: string[] = [];
      let score = 0;

      if (
        wantedSpecialization &&
        wantedSpecialization.split(/\s+/).some((term) => specialization.includes(term))
      ) {
        score += 50;
        reasons.push("specialization match");
      }

      if (preferredCity && city && preferredCity === city) {
        score += 20;
        reasons.push("same city");
      }

      const experienceScore = Math.min(years * 2, 40);
      score += experienceScore;
      if (years > 0) reasons.push(`${years}+ years`);

      const ratingScore = Math.min(rating * 5, 25);
      score += ratingScore;
      if (rating > 0) reasons.push(`${rating.toFixed(1)} rating`);

      return {
        ...lawyer,
        rating,
        score,
        matchedCategory: category,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || b.rating - a.rating)
    .slice(0, limit);

  matchCache.set(cacheKey, matches);
  return matches;
}
