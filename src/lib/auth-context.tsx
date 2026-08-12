import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  name: string;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function fallbackName(user: User | null) {
  if (!user) return "";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName = (meta["full_name"] ?? meta["name"]) as string | undefined;
  return metaName || (user.email ? user.email.split("@")[0] : "");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProfile(current: User | null) {
    if (!current) {
      setName("");
      return;
    }
    setName(fallbackName(current));
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", current.id)
      .maybeSingle();
    if (data?.full_name) setName(data.full_name);
  }

  useEffect(() => {
    let alive = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUser(data.user ?? null);
      await loadProfile(data.user ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      name,
      loading,
      refreshProfile: () => loadProfile(user),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [user, name, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
