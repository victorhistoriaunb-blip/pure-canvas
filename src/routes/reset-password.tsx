import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha · PINA Finanças" },
      { name: "description", content: "Defina uma nova senha para acessar seu painel financeiro." },
      { property: "og:title", content: "Redefinir senha · PINA Finanças" },
      { property: "og:description", content: "Defina uma nova senha de acesso ao PINA Finanças." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) {
        setError("Link inválido ou expirado. Solicite um novo e-mail de recuperação.");
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (err) {
      setError("Não foi possível atualizar a senha. Tente novamente.");
      return;
    }
    setInfo("Senha atualizada! Redirecionando…");
    setTimeout(() => void router.navigate({ to: "/" }), 900);
  }

  return (
    <div className="grid-noise flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="panel w-full max-w-sm p-8"
      >
        <h1 className="text-lg font-semibold tracking-tight">Definir nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma nova senha para sua conta do PINA Finanças.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Nova senha
            </span>
            <span className="relative flex items-center">
              <Lock className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-background/60 py-2.5 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/35"
              />
            </span>
          </label>

          {error && <p className="rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>}
          {info && <p className="rounded-lg bg-success/15 px-3 py-2 text-xs text-success">{info}</p>}

          <button
            type="submit"
            disabled={pending || !ready}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Salvar nova senha
          </button>
        </form>
      </motion.div>
    </div>
  );
}
