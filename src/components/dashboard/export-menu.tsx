import { useState } from "react";
import { Download, FileText, Loader2, Presentation, Settings2, Sheet } from "lucide-react";
import logo from "@/assets/logo.png";
import { useFinance } from "@/lib/finance-store";
import type { ReportSnapshot } from "@/lib/report.types";
import { ReportSettingsPanel } from "@/components/dashboard/report-settings";

type Build = () => Omit<ReportSnapshot, "brand">;

/** Botão de exportação (PDF, PowerPoint e CSV) do estado atual da tela. */
export function ExportMenu({ build }: { build: Build }) {
  const { settings } = useFinance();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customize, setCustomize] = useState(false);

  async function run(kind: "pdf" | "pptx" | "csv") {
    setBusy(kind);
    setError(null);
    try {
      const snapshot: ReportSnapshot = {
        ...build(),
        brand: {
          appName: settings.appName,
          tagline: settings.tagline,
          company: settings.companyName,
          email: settings.companyEmail,
          phone: settings.companyPhone,
          logoUrl: logo,
        },
        profile: settings.report,
      };
      const mod = await import("@/lib/export-report");
      if (kind === "pdf") await mod.exportPdf(snapshot);
      else if (kind === "pptx") await mod.exportPptx(snapshot);
      else mod.exportCsv(snapshot);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o arquivo.");
    } finally {
      setBusy(null);
    }
  }

  const items = [
    { id: "pdf" as const, icon: FileText, label: "PDF", hint: "Relatório com logo em todas as páginas" },
    { id: "pptx" as const, icon: Presentation, label: "PowerPoint (.pptx)", hint: "Editável — abre também no Canva" },
    { id: "csv" as const, icon: Sheet, label: "CSV", hint: "Dados brutos para planilhas" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
        Exportar
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-border bg-popover p-2 shadow-[var(--shadow-card)]"
          >
            <p className="px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Exportar o que está na tela
            </p>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={busy !== null}
                onClick={() => void run(item.id)}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface/70 disabled:opacity-60"
              >
                <item.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-popover-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.hint}</span>
                </span>
                {busy === item.id && <Loader2 className="mt-0.5 size-3.5 animate-spin text-muted-foreground" />}
              </button>
            ))}
            {error && <p className="px-3 py-2 text-xs text-destructive">{error}</p>}
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setCustomize(true);
                setOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface/70"
            >
              <Settings2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-popover-foreground">Personalizar relatório</span>
                <span className="block text-xs text-muted-foreground">Cliente, logo, template e seções</span>
              </span>
            </button>
          </div>
        </>
      )}
      <ReportSettingsPanel open={customize} onClose={() => setCustomize(false)} />
    </div>
  );
}
