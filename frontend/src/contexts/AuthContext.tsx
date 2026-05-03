import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  language: "en" | "hi";
  role: "user" | "lawyer";
  barCouncilId?: string;
  licenseNumber?: string;
  specialization?: string;
  experience?: string;
  location?: string;
  languages?: string[];
  phone?: string;
  bio?: string;
  isVerified?: boolean;
};

export type LawyerData = {
  barCouncilId: string;
  licenseNumber: string;
  specialization: string;
  experience: string;
  location: string;
  languages: string[];
  phone: string;
  bio: string;
};

type AuthCtx = {
  user: UserProfile | null;
  /** True only while resolving the initial Supabase session (not while loading profile rows). */
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  signup: (
    email: string,
    password: string,
    name: string,
    role?: "user" | "lawyer",
    lawyerData?: LawyerData
  ) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<UserProfile, "name" | "language" | "role">>) => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  language: "en" | "hi";
  role: "user" | "lawyer";
  bar_council_id?: string;
  license_number?: string;
  specialization?: string;
  experience?: string;
  location?: string;
  languages?: string[];
  phone?: string;
  bio?: string;
  is_verified?: boolean;
};

function mapProfileRow(profile: ProfileRow): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    language: profile.language,
    role: profile.role,
    barCouncilId: profile.bar_council_id,
    licenseNumber: profile.license_number,
    specialization: profile.specialization,
    experience: profile.experience,
    location: profile.location,
    languages: profile.languages,
    phone: profile.phone,
    bio: profile.bio,
    isVerified: profile.is_verified,
  };
}

/** When the DB row is missing or unreadable, keep the app usable from JWT + user_metadata. */
function buildFallbackProfile(authUser: User): UserProfile {
  const meta = authUser.user_metadata ?? {};
  const roleRaw = typeof meta.role === "string" ? meta.role : "user";
  const role: "user" | "lawyer" = roleRaw === "lawyer" ? "lawyer" : "user";
  const name =
    typeof meta.name === "string" && meta.name.trim().length > 0
      ? meta.name.trim()
      : (authUser.email?.split("@")[0] ?? "User");

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name,
    language: "en",
    role,
    barCouncilId: typeof meta.barCouncilId === "string" ? meta.barCouncilId : undefined,
    licenseNumber: typeof meta.licenseNumber === "string" ? meta.licenseNumber : undefined,
    specialization: typeof meta.specialization === "string" ? meta.specialization : undefined,
    experience: typeof meta.experience === "string" ? meta.experience : undefined,
    location: typeof meta.location === "string" ? meta.location : undefined,
    languages: Array.isArray(meta.languages) ? meta.languages : undefined,
    phone: typeof meta.phone === "string" ? meta.phone : undefined,
    bio: typeof meta.bio === "string" ? meta.bio : undefined,
  };
}

function buildInsertRowFromAuthUser(authUser: User): Record<string, unknown> {
  const meta = authUser.user_metadata ?? {};
  const roleRaw = typeof meta.role === "string" ? meta.role : "user";
  const role: "user" | "lawyer" = roleRaw === "lawyer" ? "lawyer" : "user";
  const name =
    typeof meta.name === "string" && meta.name.trim().length > 0
      ? meta.name.trim()
      : (authUser.email?.split("@")[0] ?? "User");

  const insertRow: Record<string, unknown> = {
    id: authUser.id,
    email: authUser.email ?? "",
    name,
    language: "en",
    role,
  };

  if (role === "lawyer") {
    insertRow.bar_council_id = typeof meta.barCouncilId === "string" ? meta.barCouncilId : null;
    insertRow.license_number = typeof meta.licenseNumber === "string" ? meta.licenseNumber : null;
    insertRow.specialization = typeof meta.specialization === "string" ? meta.specialization : null;
    insertRow.experience = typeof meta.experience === "string" ? meta.experience : null;
    insertRow.location = typeof meta.location === "string" ? meta.location : null;
    insertRow.languages = Array.isArray(meta.languages) ? meta.languages : null;
    insertRow.phone = typeof meta.phone === "string" ? meta.phone : null;
    insertRow.bio = typeof meta.bio === "string" ? meta.bio : null;
  }

  return insertRow;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * Loads `profiles` for authUser. Never throws. Does not sign out.
   * On any failure or missing row after insert attempt, returns a fallback built from the session.
   */
  const loadUserFromAuth = useCallback(async (authUser: User | null): Promise<UserProfile | null> => {
    if (!authUser?.id) {
      return null;
    }

    const readProfile = async (): Promise<{ row: ProfileRow | null; error: Error | null }> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("[Auth] profiles SELECT error:", error.message, error.code ?? "");
          return { row: null, error: new Error(error.message) };
        }
        return { row: data as ProfileRow | null, error: null };
      } catch (e) {
        console.error("[Auth] profiles SELECT exception:", e);
        return { row: null, error: e instanceof Error ? e : new Error(String(e)) };
      }
    };

    const { row: initialRow, error: readError } = await readProfile();
    if (initialRow) {
      return mapProfileRow(initialRow);
    }

    if (readError) {
      console.warn("[Auth] Using session fallback profile (read failed).");
      return buildFallbackProfile(authUser);
    }

    const insertRow = buildInsertRowFromAuthUser(authUser);
    try {
      const { error: insertError } = await supabase.from("profiles").insert(insertRow as never);

      if (insertError) {
        if (insertError.code === "23505") {
          const { row: rowAfterConflict } = await readProfile();
          if (rowAfterConflict) {
            return mapProfileRow(rowAfterConflict);
          }
        }
        console.error("[Auth] profiles INSERT error:", insertError.message, insertError.code ?? "");
        console.warn("[Auth] Using session fallback profile (insert failed).");
        return buildFallbackProfile(authUser);
      }
    } catch (e) {
      console.error("[Auth] profiles INSERT exception:", e);
      console.warn("[Auth] Using session fallback profile (insert exception).");
      return buildFallbackProfile(authUser);
    }

    const { row: rowAfterInsert } = await readProfile();
    if (rowAfterInsert) {
      return mapProfileRow(rowAfterInsert);
    }

    console.warn("[Auth] Profile row still missing after insert; using session fallback.");
    return buildFallbackProfile(authUser);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const finishInitialLoad = () => {
      if (!cancelled) {
        setLoading(false);
      }
    };

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[Auth] getSession error:", error.message, error.name);
        }

        if (cancelled) {
          return;
        }

        const session = data.session ?? null;

        if (session?.user) {
          const profile = await loadUserFromAuth(session.user);
          if (!cancelled) {
            setUser(profile);
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("[Auth] initAuth failed:", e);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        finishInitialLoad();
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) {
        return;
      }

      try {
        if (event === "INITIAL_SESSION") {
          return;
        }

        if (event === "TOKEN_REFRESHED" && session?.user?.id === userRef.current?.id) {
          return;
        }

        if (!session?.user) {
          setUser(null);
          return;
        }

        const profile = await loadUserFromAuth(session.user);
        if (!cancelled) {
          setUser(profile);
        }
      } catch (e) {
        console.error("[Auth] onAuthStateChange handler error:", e);
        if (!cancelled && session?.user) {
          setUser(buildFallbackProfile(session.user));
        } else if (!cancelled) {
          setUser(null);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadUserFromAuth]);

  const login = async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Auth] signInWithPassword error:", error.message, error.code ?? "");
        throw error;
      }

      const authUser = data.user ?? data.session?.user;
      if (!authUser) {
        throw new Error("Failed to retrieve authenticated user from Supabase");
      }

      const profile = await loadUserFromAuth(authUser);
      setUser(profile);
      return profile;
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      throw new Error(err.message || err.code || "Login failed");
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: "user" | "lawyer" = "user",
    lawyerData?: LawyerData
  ): Promise<UserProfile | null> => {
    try {
      const metadata: Record<string, unknown> = {
        name,
        role,
        ...(lawyerData ? { ...lawyerData } : {}),
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (error) {
        console.error("[Auth] signUp error:", error.message, error.code ?? "");
        throw error;
      }

      const authUser = data.user ?? data.session?.user;
      if (!authUser) {
        console.warn("[Auth] signUp returned no user (e.g. email confirmation required).");
        return null;
      }

      const profile = await loadUserFromAuth(authUser);
      setUser(profile);
      return profile;
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      console.error("[Auth] signup catch:", err);
      throw new Error(err.message || err.code || "Signup failed");
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[Auth] signOut error:", error.message, error.code ?? "");
        throw error;
      }

      setUser(null);
    } catch (error) {
      console.error("[Auth] logout error:", error);
      toast.error("Could not log out. Please try again.");
      throw error;
    }
  };

  const updateProfile = async (patch: Partial<Pick<UserProfile, "name" | "language" | "role">>) => {
    if (!user) {
      return;
    }

    try {
      const row: Record<string, string> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.language !== undefined) row.language = patch.language;
      if (patch.role !== undefined) row.role = patch.role;
      const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
      if (error) {
        console.error("[Auth] profile UPDATE error:", error.message, error.code ?? "");
        throw error;
      }

      setUser((prev) => (prev ? { ...prev, ...patch } : null));
      toast.success("Profile updated");
    } catch (error) {
      console.error("[Auth] updateProfile error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
