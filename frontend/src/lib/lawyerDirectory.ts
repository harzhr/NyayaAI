import { supabase } from "@/lib/supabase";
import { DEMO_LAWYERS, type DemoLawyer } from "@/data/demoLawyers";

export type RegisteredLawyerCard = {
  kind: "registered";
  id: string;
  name: string;
  specialization: string | null;
  experience: string | null;
  location: string | null;
  rating: number | null;
  languages: string[] | null;
  bio: string | null;
};

export type DirectoryLawyer = RegisteredLawyerCard | (DemoLawyer & { kind: "demo" });

type LawyerProfileRow = {
  id: string;
  name: string | null;
  specialization: string | null;
  experience: string | null;
  location: string | null;
  rating?: unknown;
  languages: string[] | null;
  bio: string | null;
};

const DEMO_BY_KEY = new Map(DEMO_LAWYERS.map((d) => [d.key, d]));

function parseRating(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getDemoLawyer(key: string): DemoLawyer | undefined {
  return DEMO_BY_KEY.get(key);
}

export async function fetchRegisteredLawyersForDirectory(): Promise<{
  lawyers: RegisteredLawyerCard[];
  error: Error | null;
}> {
  const query = supabase
    .from("profiles")
    .select("id,name,specialization,experience,location,rating,languages,bio,role")
    .eq("role", "lawyer")
    .order("name", { ascending: true });

  let { data, error } = await query;
  let rows = (data ?? []) as LawyerProfileRow[];

  if (error && error.message.toLowerCase().includes("rating")) {
    const fallback = await supabase
      .from("profiles")
      .select("id,name,specialization,experience,location,languages,bio,role")
      .eq("role", "lawyer")
      .order("name", { ascending: true });
    rows = (fallback.data ?? []) as LawyerProfileRow[];
    error = fallback.error;
  }

  if (error) {
    return { lawyers: [], error: new Error(error.message) };
  }

  const lawyers: RegisteredLawyerCard[] = rows.map((row) => ({
    kind: "registered",
    id: row.id,
    name: row.name ?? "Lawyer",
    specialization: row.specialization ?? null,
    experience: row.experience ?? null,
    location: row.location ?? null,
    rating: parseRating(row.rating),
    languages: row.languages ?? null,
    bio: row.bio ?? null,
  }));

  return { lawyers, error: null };
}

/** Registered lawyers first, then demo profiles (stable UX). */
export function buildLawyerDirectoryList(registered: RegisteredLawyerCard[]): DirectoryLawyer[] {
  const demos: DirectoryLawyer[] = DEMO_LAWYERS.map((d) => ({ ...d, kind: "demo" as const }));
  return [...registered, ...demos];
}
