import { supabase } from "@/lib/supabase";
import { DEMO_LAWYERS, type DemoLawyer } from "@/data/demoLawyers";

export type RegisteredLawyerCard = {
  kind: "registered";
  id: string;
  name: string;
  specialization: string | null;
  experience: string | null;
  location: string | null;
  languages: string[] | null;
  bio: string | null;
};

export type DirectoryLawyer = RegisteredLawyerCard | (DemoLawyer & { kind: "demo" });

const DEMO_BY_KEY = new Map(DEMO_LAWYERS.map((d) => [d.key, d]));

export function getDemoLawyer(key: string): DemoLawyer | undefined {
  return DEMO_BY_KEY.get(key);
}

export async function fetchRegisteredLawyersForDirectory(): Promise<{
  lawyers: RegisteredLawyerCard[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,specialization,experience,location,languages,bio,role")
    .eq("role", "lawyer")
    .order("name", { ascending: true });

  if (error) {
    return { lawyers: [], error: new Error(error.message) };
  }

  const lawyers: RegisteredLawyerCard[] = (data ?? []).map((row) => ({
    kind: "registered",
    id: row.id,
    name: row.name ?? "Lawyer",
    specialization: row.specialization ?? null,
    experience: row.experience ?? null,
    location: row.location ?? null,
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
