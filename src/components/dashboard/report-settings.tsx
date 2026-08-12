import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import {
  DEFAULT_REPORT_PROFILE,
  type ReportField,
  type ReportProfile,
  type ReportTemplate,
} from "@/lib/finance.types";

const inputClass =
  "w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/35";

const MAX_LOGO_BYTES = 500 * 1024;

const TEMPLATES: { id: ReportTemplate; label: string; hint: string }[] = [
  { id: "institucional", label: "Institucional", hint: "Faixa escura, visual formal" },
  { id: "minimalista", label: "Minimalista", hint: "Fundo branco, linha fina" },
  { id: "executivo", label: "Executivo", hint: "Faixa colorida, KPIs em destaque" },
];

function Field({
  label,
  value,
  onChange,
  maxLength = 80,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input accent-[var(--color-primary)]"
      />
      {label}
    </label>
  );
}

/** Painel modal "Personalizar relatório" — edita `settings.report` na nuvem. */
export function ReportSettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, saveSettings, syncing } = useFinance();
  const [draft, setDraft] = useState<ReportProfile>(settings.report);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(settings.report);
      setSaved(false);
      setError(null);
    }
  }, [open, settings.report]);

  if (!open) return null;

  function set<K extends keyof ReportProfile>(key: K, value: ReportProfile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function onLogoPick(file: File | null) {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("A logo deve ter até 500 KB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") set("logoDataUrl", reader.result);
    };
    reader.readAsDataURL(file);
  }

  function addField() {
    const field: ReportField = { id: crypto.randomUUID(), label: "", value: "", visible: true };
    set("fields", [...draft.fields, field]);
  }

  function updateField(id: string, patch: Partial<ReportField>) {
    set("fields", draft.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    set("fields", draft.fields.filter((f) => f.id !== id));
  }

  async function onSave() {
    setError(null);
    await saveSettings({ ...settings, report: draft });
    setSaved(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-background/70 p-3 py-8 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Personalizar relatório</h2>
            <p className="text-xs text-muted-foreground">Ajuste como PDF, PowerPoint e CSV são gerados</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface/70 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente" value={draft.clientName} onChange={(v) => set("clientName", v)} placeholder="Nome do cliente/empresa" />
            <Field label="Título do relatório" value={draft.reportTitle} onChange={(v) => set("reportTitle", v)} placeholder="Substitui o título padrão" />
            <Field label="Responsável" value={draft.preparedBy} onChange={(v) => set("preparedBy", v)} placeholder="Quem preparou" />
            <Field label="Observação de rodapé" value={draft.footerNote} onChange={(v) => set("footerNote", v)} maxLength={140} placeholder="Aparece no rodapé/capa" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Modelo</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set("template", t.id)}
                  aria-pressed={draft.template === t.id}
                  className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    draft.template === t.id
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="text-xs font-semibold">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Logo personalizada</span>
            <div className="flex flex-wrap items-center gap-3">
              {draft.logoDataUrl && (
                <img src={draft.logoDataUrl} alt="Logo" className="size-12 rounded-lg border border-border object-contain bg-background/60" />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onLogoPick(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
              >
                <Upload className="size-3.5" /> Enviar logo
              </button>
              {draft.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => set("logoDataUrl", "")}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Remover
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Até 500 KB. Tem prioridade sobre a logo padrão do app.</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Seções incluídas</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Capa" checked={draft.showCover} onChange={(v) => set("showCover", v)} />
              <Toggle label="Filtros aplicados" checked={draft.showFilters} onChange={(v) => set("showFilters", v)} />
              <Toggle label="Gráficos" checked={draft.showCharts} onChange={(v) => set("showCharts", v)} />
              <Toggle label="Tabelas" checked={draft.showTables} onChange={(v) => set("showTables", v)} />
              <Toggle label="Observações" checked={draft.showNotes} onChange={(v) => set("showNotes", v)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Campos livres</span>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="size-3.5" /> Adicionar
              </button>
            </div>
            {draft.fields.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum campo extra. Use para códigos, projetos, período contratual etc.</p>
            )}
            <div className="flex flex-col gap-2">
              {draft.fields.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                  <input
                    value={f.label}
                    onChange={(e) => updateField(f.id, { label: e.target.value })}
                    placeholder="Rótulo"
                    className="min-w-[110px] flex-1 rounded-lg border border-input bg-background/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <input
                    value={f.value}
                    onChange={(e) => updateField(f.id, { value: e.target.value })}
                    placeholder="Valor"
                    className="min-w-[110px] flex-1 rounded-lg border border-input bg-background/60 px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={f.visible}
                      onChange={(e) => updateField(f.id, { visible: e.target.checked })}
                      className="size-3.5 rounded border-input accent-[var(--color-primary)]"
                    />
                    Visível
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover campo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={syncing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {syncing && <Loader2 className="size-4 animate-spin" />} Salvar personalização
          </button>
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_REPORT_PROFILE)}
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/60"
          >
            Restaurar padrão
          </button>
          {saved && !syncing && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <Check className="size-4" /> Salvo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
