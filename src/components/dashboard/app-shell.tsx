import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BarChart3,
  LayoutGrid,
  LayoutDashboard,
  FileBarChart,
  Target,
  Upload,
  Menu,
  X,
  LogOut,
  Wallet,
  BookOpen,
  Settings,
  CalendarDays,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import logo from "@/assets/logo.png";
import { useFinance } from "@/lib/finance-store";
import { useAuth } from "@/lib/auth-context";
import type { FontChoice } from "@/lib/finance.types";

const ACCENTS: Record<string, { primary: string; accent: string }> = {
  azul: { primary: "oklch(0.623 0.188 259.8)", accent: "oklch(0.715 0.126 215.2)" },
  violeta: { primary: "oklch(0.62 0.21 295)", accent: "oklch(0.72 0.14 320)" },
  esmeralda: { primary: "oklch(0.65 0.15 162)", accent: "oklch(0.74 0.13 190)" },
  ambar: { primary: "oklch(0.72 0.16 70)", accent: "oklch(0.78 0.14 95)" },
  rosa: { primary: "oklch(0.65 0.2 350)", accent: "oklch(0.74 0.14 20)" },
};

const FONT_STACKS: Record<FontChoice, string> = {
  sistema:
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  manrope: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  sora: "'Sora', ui-sans-serif, system-ui, sans-serif",
  "ibm-plex": "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  lora: "'Lora', ui-serif, Georgia, serif",
};

const NATIVE_ICON: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  paineis: LayoutDashboard,
  contas: Wallet,
  agenda: CalendarDays,
  importar: Upload,
  analise: BarChart3,
  relatorios: FileBarChart,
  metas: Target,
  "como-usar": BookOpen,
  configuracoes: Settings,
};

const NATIVE_TO: Record<string, string> = {
  dashboard: "/",
  paineis: "/paineis",
  contas: "/contas",
  agenda: "/agenda",
  importar: "/importar",
  analise: "/analise",
  relatorios: "/relatorios",
  metas: "/metas",
  "como-usar": "/como-usar",
  configuracoes: "/configuracoes",
};

function useNavItems() {
  const { settings } = useFinance();
  return useMemo(() => {
    const pageIds = new Set(settings.pages.map((p) => p.id));
    return settings.nav
      .filter((item) => item.visible || item.id === "configuracoes")
      .map((item) => {
        const isPage = pageIds.has(item.id);
        const icon = NATIVE_ICON[item.id] ?? FileText;
        const to = isPage ? undefined : NATIVE_TO[item.id];
        return { id: item.id, label: item.label, icon, to, isPage };
      });
  }, [settings.nav, settings.pages]);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const items = useNavItems();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) =>
        item.isPage ? (
          <Link
            key={item.id}
            to="/pagina/$id"
            params={{ id: item.id }}
            onClick={onNavigate}
            activeProps={{
              className:
                "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--color-primary)]",
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ) : (
          <Link
            key={item.id}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{
              className:
                "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--color-primary)]",
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}

function SidebarBody({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) {
  const { settings } = useFinance();
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-3 px-2 pt-1">
        <img src={logo} alt={settings.appName} width={512} height={512} className="size-9 shrink-0 rounded-xl object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{settings.appName}</p>
          <p className="truncate text-xs text-muted-foreground">{settings.tagline}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Navegação
        </p>
        <NavList onNavigate={onNavigate} />
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-destructive/15 hover:text-destructive"
      >
        <LogOut className="size-4" />
        Sair
      </button>
    </div>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  onLogout,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { settings } = useFinance();
  const { name } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const theme = ACCENTS[settings.accent] ?? ACCENTS["azul"]!;
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--ring", theme.primary);
    root.style.setProperty("--chart-1", theme.primary);
    root.style.setProperty("--chart-2", theme.accent);
    root.style.setProperty("--app-font", FONT_STACKS[settings.typography.font] ?? FONT_STACKS.sistema);
    root.style.setProperty("--app-scale", String(settings.typography.scale ?? 1));
  }, [settings.accent, settings.typography]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    drawerRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const compact = settings.density === "compacta";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarBody onLogout={onLogout} />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar outline-none"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Fechar menu"
            >
              <X className="size-4" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} onLogout={onLogout} />
          </motion.div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-4" />
              </button>
              <img
                src={logo}
                alt={settings.appName}
                width={512}
                height={512}
                className="size-9 shrink-0 rounded-xl object-contain lg:hidden"
              />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold tracking-wide text-primary">
                  {settings.greeting}
                  {name ? `, ${name}` : ""}
                </p>
                <h1
                  className="truncate text-lg tracking-tight text-foreground sm:text-xl"
                  style={{ fontWeight: Number(settings.typography.headingWeight) }}
                >
                  {title}
                </h1>
                {subtitle && <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 sm:hidden">{actions}</div>
          )}
        </header>

        <main className={`min-w-0 flex-1 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}>{children}</main>
      </div>
    </div>
  );
}
