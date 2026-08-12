import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · PINA Finanças — Dashboard Financeiro" },
      {
        name: "description",
        content:
          "Acesse seu dashboard financeiro pessoal com visão de receitas, despesas, categorias e metas.",
      },
      { property: "og:title", content: "Entrar · PINA Finanças" },
      {
        property: "og:description",
        content: "Área protegida do seu dashboard financeiro pessoal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  // A tela usa efeitos de vidro/animação que dependem do navegador — evita
  // divergência entre o HTML do servidor e o do cliente.
  ssr: false,
  component: LoginPage,
});


type Mode = "entrar" | "criar" | "recuperar";

const MODES: { id: Mode; label: string }[] = [
  { id: "entrar", label: "Entrar" },
  { id: "criar", label: "Criar conta" },
  { id: "recuperar", label: "Esqueci a senha" },
];

const inputClass =
  "w-full rounded-xl border border-input bg-background/60 py-2.5 pr-3 pl-9 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-ring/35";

function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("entrar");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function reset(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    setError(null);
    setInfo(null);

    if (!email) return setError("Informe seu e-mail.");
    if (mode !== "recuperar" && password.length < 6)
      return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (mode === "criar" && !name) return setError("Informe seu nome.");

    setPending(true);
    try {
      if (mode === "entrar") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError("E-mail ou senha inválidos.");
          return;
        }
        await router.navigate({ to: "/" });
      } else if (mode === "criar") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (err) {
          setError(
            err.message.toLowerCase().includes("already")
              ? "Já existe uma conta com esse e-mail. Faça login."
              : "Não foi possível criar a conta. Tente novamente.",
          );
          return;
        }
        if (data.session) {
          await router.navigate({ to: "/" });
        } else {
          setInfo("Conta criada! Confirme o e-mail que enviamos para ativar seu acesso.");
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) {
          setError("Não foi possível enviar o e-mail de recuperação.");
          return;
        }
        setInfo("Enviamos um link de redefinição para o seu e-mail.");
      }
    } catch {
      setError("Não foi possível continuar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }




  return (
    <div className="grid-noise relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="pointer-events-none absolute top-1/4 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="panel relative w-full max-w-sm p-8"
      >
        <div className="flex flex-col items-center text-center">
          <motion.img
            src={logo}
            alt="PINA Finanças"
            width={512}
            height={512}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="size-16 object-contain"
          />
          <h1 className="mt-3 text-xl font-semibold tracking-tight">PINA Finanças</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso protegido ao seu painel financeiro
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/50 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => reset(m.id)}
              className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition-colors ${
                mode === m.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {mode === "criar" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Nome
              </span>
              <span className="relative flex items-center">
                <User className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                <input name="name" autoComplete="name" maxLength={80} placeholder="Seu nome" className={inputClass} />
              </span>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              E-mail
            </span>
            <span className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={160}
                placeholder="voce@email.com"
                className={inputClass}
              />
            </span>
          </label>

          {mode !== "recuperar" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Senha
              </span>
              <span className="relative flex items-center">
                <Lock className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                <input
                  name="password"
                  type="password"
                  autoComplete={mode === "criar" ? "new-password" : "current-password"}
                  maxLength={200}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </span>
            </label>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </motion.p>
          )}
          {info && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-success/15 px-3 py-2 text-xs text-success"
            >
              {info}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.985] disabled:opacity-70"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}
          </button>
        </form>
      </motion.div>

    </div>
  );
}
