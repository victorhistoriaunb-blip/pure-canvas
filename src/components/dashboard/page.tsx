import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { FileSpreadsheet, Loader2, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useFinance } from "@/lib/finance-store";
import { AppShell } from "./app-shell";
import { RecordDialog } from "./record-form";

export function Page({
  title,
  subtitle,
  actions,
  requireData = true,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  requireData?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { ready, transactions } = useFinance();

  async function handleLogout() {
    await signOut();
    await router.navigate({ to: "/login", replace: true });
  }

  return (
    <AppShell title={title} subtitle={subtitle} actions={actions} onLogout={handleLogout}>
      {!ready ? (
        <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
          <span className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Carregando seus dados…
          </span>
        </div>
      ) : requireData && transactions.length === 0 ? (
        <EmptyState />
      ) : (
        children
      )}
    </AppShell>
  );
}

export function EmptyState() {
  const [creating, setCreating] = useState(false);
  return (
    <div className="panel grid min-h-[50vh] place-items-center p-8 text-center">
      {creating && <RecordDialog onClose={() => setCreating(false)} />}
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <FileSpreadsheet className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">Nenhum registro ainda</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Você pode importar planilhas Excel (.xlsx ou .xls) ou cadastrar registros manualmente —
          os dois caminhos alimentam automaticamente indicadores, gráficos e relatórios.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110"
          >
            <Plus className="size-4" /> Novo registro
          </button>
          <Link
            to="/importar"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/60"
          >
            Importar planilhas
          </Link>
        </div>
      </div>
    </div>
  );
}

export function NewRecordButton({ label = "Novo registro" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <RecordDialog onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
      >
        <Plus className="size-4" /> {label}
      </button>
    </>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
