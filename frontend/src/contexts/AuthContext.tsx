import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const AUTH_INIT_TIMEOUT_MS = 4000;
const HAS_SUPABASE_CONFIG = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);
const STORED_USER_KEY = "nyayaai_user";

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
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
  rating?: number;
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
  rating?: number;
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
    rating: profile.rating,
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

function getStoredUser(): UserProfile | null {
  try {
    const storedUser = localStorage.getItem(STORED_USER_KEY);
    return storedUser ? (JSON.parse(storedUser) as UserProfile) : null;
  } catch (error) {
    console.error("[Auth] Failed to restore user from localStorage:", error);
    return null;
  }
}

function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "";
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if ("code" in error && typeof error.code === "string") {
      return error.code;
    }
  }

  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    userRef.current = user;
    if (user) {
      localStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORED_USER_KEY);
    }
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
          console.error("[Auth] profiles SELECT error:", error.message, errorCode(error));
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
        if (errorCode(insertError) === "23505") {
          const { row: rowAfterConflict } = await readProfile();
          if (rowAfterConflict) {
            return mapProfileRow(rowAfterConflict);
          }
        }
        console.error("[Auth] profiles INSERT error:", insertError.message, errorCode(insertError));
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
    let didFinishInitialLoad = false;

    const finishInitialLoad = (): boolean => {
      if (!cancelled && !didFinishInitialLoad) {
        didFinishInitialLoad = true;
        setLoading(false);
        return true;
      }
      return false;
    };

    const hydrateProfileInBackground = (authUser: User) => {
      void loadUserFromAuth(authUser)
        .then((fullProfile) => {
          if (!cancelled && fullProfile) {
            setUser(fullProfile);
          }
        })
        .catch((profileError) => {
          console.warn("[Auth] Failed to load full profile, keeping session fallback:", profileError);
        });
    };

    const getSessionWithRetry = async (): Promise<{
      session: Session | null;
      error: Error | null;
    }> => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          "auth_init"
        );
        return { session: data.session, error: error ? new Error(error.message) : null };
      } catch (firstError) {
        console.warn("[Auth] Session check failed, retrying once:", firstError);
      }

      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          "auth_init_retry"
        );
        return { session: data.session, error: error ? new Error(error.message) : null };
      } catch (retryError) {
        return {
          session: null,
          error: retryError instanceof Error ? retryError : new Error(String(retryError)),
        };
      }
    };

    const initAuth = async () => {
      const ensureLoadingFinished = () => {
        if (!cancelled) {
          finishInitialLoad();
        }
      };

      try {
        if (!HAS_SUPABASE_CONFIG) {
          console.warn("[Auth] Supabase not configured. Using localStorage fallback only.");
          setUser(getStoredUser());
          return;
        }

        const { session, error: sessionError } = await getSessionWithRetry();

        if (cancelled) {
          ensureLoadingFinished();
          return;
        }

        if (sessionError) {
          console.error("[Auth] getSession error:", sessionError.message);
        }

        const sessionUser = session?.user ?? null;

        if (sessionUser) {
          const fallbackUser = buildFallbackProfile(sessionUser);
          setUser(fallbackUser);
          finishInitialLoad();
          hydrateProfileInBackground(sessionUser);
          return;
        }

        setUser(sessionError ? getStoredUser() : null);
      } catch (e) {
        console.error("[Auth] initAuth failed:", e);
        if (!cancelled) {
          setUser(getStoredUser());
        }
      } finally {
        ensureLoadingFinished();
      }
    };

    // Hard safety net: never keep app blocked on the splash spinner.
    const hardStopTimer = setTimeout(() => {
      const released = finishInitialLoad();
      if (released && import.meta.env.DEV) {
        console.warn("[Auth] init watchdog released loading state.");
      }
    }, AUTH_INIT_TIMEOUT_MS * 2 + 1000);

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

        setUser(buildFallbackProfile(session.user));
        hydrateProfileInBackground(session.user);
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
      clearTimeout(hardStopTimer);
      subscription.unsubscribe();
    };
  }, [loadUserFromAuth]);

  const login = async (email: string, password: string): Promise<UserProfile | null> => {
    if (!HAS_SUPABASE_CONFIG) {
      console.warn("[Auth] Supabase not configured, using localStorage fallback for login");
      const mockUser: UserProfile = {
        id: `local_${Date.now()}`,
        email,
        name: email.split("@")[0] || "User",
        language: "en",
        role: "user",
      };

      setUser(mockUser);
      return mockUser;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Auth] signInWithPassword error:", error.message, errorCode(error));
        throw error;
      }

      const authUser = data.session?.user ?? data.user;
      if (!authUser) {
        throw new Error("Failed to retrieve authenticated user from Supabase");
      }

      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      if (!activeSession?.user) {
        throw new Error("Login succeeded but no active session was found.");
      }

      const profile = await loadUserFromAuth(authUser);
      setUser(profile);
      return profile;
    } catch (error: unknown) {
      throw new Error(errorMessage(error, "Login failed"));
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: "user" | "lawyer" = "user",
    lawyerData?: LawyerData
  ): Promise<UserProfile | null> => {
    if (!HAS_SUPABASE_CONFIG) {
      console.warn("[Auth] Supabase not configured, using localStorage fallback for signup");
      const mockUser: UserProfile = {
        id: `local_${Date.now()}`,
        email,
        name: name || email.split("@")[0] || "User",
        language: "en",
        role,
        ...(lawyerData && {
          barCouncilId: lawyerData.barCouncilId,
          licenseNumber: lawyerData.licenseNumber,
          specialization: lawyerData.specialization,
          experience: lawyerData.experience,
          location: lawyerData.location,
          languages: lawyerData.languages,
          phone: lawyerData.phone,
          bio: lawyerData.bio,
        }),
      };

      setUser(mockUser);
      return mockUser;
    }

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
        console.error("[Auth] signUp error:", error.message, errorCode(error));
        throw error;
      }

      // In many Supabase setups, sign-up may return a user but no active session
      // until email confirmation is complete.
      const authUser = data.session?.user ?? data.user;
      if (!authUser) {
        console.warn("[Auth] signUp returned no user.");
        return null;
      }

      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      if (!activeSession?.user) {
        console.warn("[Auth] signUp created account but no active session (email confirmation likely required).");
        return null;
      }

      const profile = await loadUserFromAuth(authUser);
      setUser(profile);
      return profile;
    } catch (error: unknown) {
      console.error("[Auth] signup catch:", error);
      throw new Error(errorMessage(error, "Signup failed"));
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (HAS_SUPABASE_CONFIG) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("[Auth] signOut error:", error.message, errorCode(error));
          throw error;
        }
      } else {
        console.warn("[Auth] Supabase not configured, using localStorage logout only");
      }

      setUser(null);
      localStorage.removeItem(STORED_USER_KEY);
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
        console.error("[Auth] profile UPDATE error:", error.message, errorCode(error));
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
