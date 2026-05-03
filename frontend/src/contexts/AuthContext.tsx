import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/** Safety cap for DB profile fetch only (not a delay—only triggers if the request hangs). */
const PROFILE_FETCH_MS = 8_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Clears broken or stale client auth storage without requiring a server round-trip. */
async function clearLocalAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }
}

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
  /** True only while restoring session on app load (routes should wait). */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  const fetchProfile = useCallback(
    async (authUser: User | null): Promise<UserProfile | null> => {
      const mapProfile = (profile: ProfileRow): UserProfile => ({
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
      });
      if (!authUser?.id) {
        return null;
      }

      const readProfile = async (): Promise<ProfileRow | null> => {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("Profile fetch error:", error);
          return null;
        }
        return profile;
      };

      let profile = await readProfile();

      if (!profile) {
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

        const { error: insertError } = await supabase.from("profiles").insert(insertRow as never);
        if (insertError?.code === "23505") {
          profile = await readProfile();
        } else if (insertError) {
          console.error("Profile recovery insert failed:", insertError);
          return null;
        } else {
          profile = await readProfile();
        }
      }

      if (!profile) {
        return null;
      }

      return mapProfile(profile);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    const resolveUser = async (session: Session | null): Promise<UserProfile | null> => {
      if (!session?.user) {
        return null;
      }
      try {
        return await withTimeout(fetchProfile(session.user), PROFILE_FETCH_MS, "profile");
      } catch (e) {
        console.warn("Profile load timed out or failed:", e);
        return null;
      }
    };

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) {
          return;
        }

        if (session?.user) {
          const profile = await resolveUser(session);
          if (cancelled) {
            return;
          }
          if (!profile) {
            await clearLocalAuthSession();
            setUser(null);
          } else {
            setUser(profile);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        await clearLocalAuthSession();
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
        // First load is handled by initAuth(); this event would duplicate work and can race.
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

        const profile = await resolveUser(session);
        if (cancelled) {
          return;
        }

        if (!profile) {
          await clearLocalAuthSession();
          setUser(null);
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error("Auth state change error:", error);
        await clearLocalAuthSession();
        if (!cancelled) {
          setUser(null);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      const authUser = data.user ?? data.session?.user;
      if (!authUser) {
        throw new Error("Failed to retrieve authenticated user from Supabase");
      }

      const profile = await fetchProfile(authUser);
      if (!profile) {
        await supabase.auth.signOut();
        setUser(null);
        throw new Error(
          "Your account has no profile row in the database. Run the profiles trigger/schema in Supabase or contact support."
        );
      }
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
        console.error("Signup error:", error);
        throw error;
      }

      const authUser = data.user ?? data.session?.user;
      if (!authUser) {
        return null;
      }

      const profile = await fetchProfile(authUser);
      setUser(profile);
      return profile;
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      console.error("Signup error:", err);
      throw new Error(err.message || err.code || "Signup failed");
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        throw error;
      }

      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
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
        console.error("Update profile error:", error);
        throw error;
      }

      setUser((prev) => (prev ? { ...prev, ...patch } : null));
      toast.success("Profile updated");
    } catch (error) {
      console.error("Update profile error:", error);
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
