import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { useAuth } from "@/lib/auth-context";
import { Page } from "@/components/dashboard/page";
import { Panel } from "@/components/dashboard/charts";
import {
  DEFAULT_AGENDA_STATUSES,
  DEFAULT_NAV,
  DEFAULT_SETTINGS,
  NATIVE_TABS,
  type AgendaStatus,
  type AppSettings,
  type CustomBlock,
  type CustomBlockKind,
  type CustomPage,
  type FontChoice,
  type NavPref,
} from "@/lib/finance.types";

export const Route = createFileRoute("/_gated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · PINA Finanças" },
      {
        name: "description",
        content:
          "Personalize nome do app, saudação, cor de destaque, densidade e rótulos do menu da sua conta.",
      },
      { property: "og:title", content: "Configurações · PINA Finanças" },
      { property: "og:description", content: "Preferências e identidade da sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const ACCENTS: { id: AppSettings["accent"]; label: string; color: string }[] = [
  { id: "azul", label: "Azul", color: "oklch(0.623 0.188 259.8)" },
  { id: "violeta", label: "Violeta", color: "oklch(0.62 0.21 295)" },
  { id: "esmeralda", label: "Esmeralda", color: "oklch(0.65 0.15 162)" },
  { id: "ambar", label: "Âmbar", color: "oklch(0.72 0.16 70)" },
  { id: "rosa", label: "Rosa", color: "oklch(0.65 0.2 350)" },
];

const inputClass =
  "w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/35";

const FONT_OPTIONS: { id: FontChoice; label: string }[] = [
  { id: "sistema", label: "Sistema" },
  { id: "inter", label: "Inter" },
  { id: "manrope", label: "Manrope" },
  { id: "sora", label: "Sora" },
  { id: "ibm-plex", label: "IBM Plex Sans" },
  { id: "lora", label: "Lora" },
];

const FONT_STACKS: Record<FontChoice, string> = {
  sistema: "ui-sans-serif, system-ui, sans-serif",
  inter: "'Inter', sans-serif",
  manrope: "'Manrope', sans-serif",
  sora: "'Sora', sans-serif",
  "ibm-plex": "'IBM Plex Sans', sans-serif",
  lora: "'Lora', serif",
};

const BLOCK_KIND_LABEL: Record<CustomBlockKind, string> = {
  texto: "Texto livre",
  kpis: "Indicadores (KPIs)",
  fluxo: "Gráfico de fluxo",
  categorias: "Categorias",
  tabela: "Tabela de lançamentos",
  cards: "Cards de registros",
  vencimentos: "Vencimentos",
  insights: "Insights",
  meta: "Meta financeira",
};

const BLOCK_KINDS: CustomBlockKind[] = [
  "texto",
  "kpis",
  "fluxo",
  "categorias",
  "tabela",
  "cards",
  "vencimentos",
  "insights",
  "meta",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function Field({
  label,
  value,
  onChange,
  maxLength = 60,
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


function TypographyPanel({ draft, setDraft }: { draft: AppSettings; setDraft: (fn: (d: AppSettings) => AppSettings) => void }) {
  const t = draft.typography;
  return (
    <Panel title="Tipografia" description="Fonte, escala e peso dos títulos" delay={0.05}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fonte</span>
          <div className="flex flex-wrap gap-2">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, typography: { ...d.typography, font: f.id } }))}
                aria-pressed={t.font === f.id}
                style={{ fontFamily: FONT_STACKS[f.id] }}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  t.font === f.id
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: FONT_STACKS[t.font] }}>
            Prévia: PINA Finanças — controle claro das suas contas.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Escala do texto ({t.scale.toFixed(2)}x)
          </span>
          <input
            type="range"
            min={0.9}
            max={1.2}
            step={0.01}
            value={t.scale}
            onChange={(e) =>
              setDraft((d) => ({ ...d, typography: { ...d.typography, scale: Number(e.target.value) } }))
            }
            className="accent-[var(--color-primary)]"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Peso dos títulos
          </span>
          <div className="flex flex-wrap gap-2">
            {(["600", "700", "800"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, typography: { ...d.typography, headingWeight: w } }))}
                aria-pressed={t.headingWeight === w}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  t.headingWeight === w
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
                style={{ fontWeight: Number(w) }}
              >
                {w === "600" ? "Normal" : w === "700" ? "Forte" : "Extra forte"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function NavPanel({ draft, setDraft }: { draft: AppSettings; setDraft: (fn: (d: AppSettings) => AppSettings) => void }) {
  const nav = draft.nav;

  function move(index: number, dir: -1 | 1) {
    const next = [...nav];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setDraft((d) => ({ ...d, nav: next }));
  }

  function update(index: number, patch: Partial<NavPref>) {
    const next = nav.map((n, i) => (i === index ? { ...n, ...patch } : n));
    setDraft((d) => ({ ...d, nav: next }));
  }

  return (
    <Panel title="Menu e abas" description="Ordene, renomeie e oculte as abas do menu lateral" delay={0.1} className="xl:col-span-2">
      <div className="flex flex-col gap-2">
        {nav.map((item, i) => {
          const isFixed = item.id === "configuracoes";
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5"
            >
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Mover ${item.label} para cima`}
                  className="grid size-6 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === nav.length - 1}
                  aria-label={`Mover ${item.label} para baixo`}
                  className="grid size-6 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              <input
                value={item.label}
                onChange={(e) => update(i, { label: e.target.value })}
                maxLength={24}
                className="min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <label className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {isFixed ? "Sempre visível" : "Visível"}
                <input
                  type="checkbox"
                  checked={isFixed ? true : item.visible}
                  disabled={isFixed}
                  onChange={(e) => update(i, { visible: e.target.checked })}
                  className="size-4 rounded border-input accent-[var(--color-primary)] disabled:opacity-50"
                />
              </label>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setDraft((d) => ({ ...d, nav: DEFAULT_NAV }))}
        className="mt-3 inline-flex h-9 items-center rounded-xl border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
      >
        Restaurar padrão do menu
      </button>
    </Panel>
  );
}

function BlockEditor({
  block,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  block: CustomBlock;
  onChange: (patch: Partial<CustomBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 flex-col">
          <button type="button" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Mover bloco para cima" className="grid size-6 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronUp className="size-3.5" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={isLast} aria-label="Mover bloco para baixo" className="grid size-6 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronDown className="size-3.5" />
          </button>
        </div>
        <select
          value={block.kind}
          onChange={(e) => onChange({ kind: e.target.value as CustomBlockKind })}
          className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        >
          {BLOCK_KINDS.map((k) => (
            <option key={k} value={k}>
              {BLOCK_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <input
          value={block.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Título do bloco"
          maxLength={40}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover bloco"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {block.kind === "texto" && (
        <textarea
          value={block.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={3}
          placeholder="Escreva o texto deste bloco…"
          className="mt-2 w-full resize-y rounded-lg border border-input bg-background/60 px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      )}
    </div>
  );
}

function PagesPanel({ draft, setDraft }: { draft: AppSettings; setDraft: (fn: (d: AppSettings) => AppSettings) => void }) {
  const [newName, setNewName] = useState("");

  function addPage() {
    const name = newName.trim();
    if (!name) return;
    const id = `pagina-${uid()}`;
    const page: CustomPage = { id, name, blocks: [] };
    setDraft((d) => ({
      ...d,
      pages: [...d.pages, page],
      nav: [...d.nav, { id, label: name, visible: true }],
    }));
    setNewName("");
  }

  function removePage(id: string) {
    setDraft((d) => ({
      ...d,
      pages: d.pages.filter((p) => p.id !== id),
      nav: d.nav.filter((n) => n.id !== id),
    }));
  }

  function renamePage(id: string, name: string) {
    setDraft((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === id ? { ...p, name } : p)),
      nav: d.nav.map((n) => (n.id === id ? { ...n, label: name } : n)),
    }));
  }

  function updateBlocks(id: string, blocks: CustomBlock[]) {
    setDraft((d) => ({ ...d, pages: d.pages.map((p) => (p.id === id ? { ...p, blocks } : p)) }));
  }

  function addBlock(page: CustomPage) {
    const block: CustomBlock = { id: uid(), kind: "texto", title: "Novo bloco", text: "" };
    updateBlocks(page.id, [...page.blocks, block]);
  }

  return (
    <Panel title="Abas personalizadas" description="Crie páginas próprias combinando blocos" delay={0.15} className="xl:col-span-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da nova aba"
          maxLength={30}
          className={inputClass + " max-w-xs"}
        />
        <button
          type="button"
          onClick={addPage}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          <Plus className="size-4" /> Nova aba
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {draft.pages.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma aba personalizada ainda.</p>
        )}
        {draft.pages.map((page) => (
          <div key={page.id} className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={page.name}
                onChange={(e) => renamePage(page.id, e.target.value)}
                maxLength={30}
                className="min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-2.5 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => removePage(page.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Excluir aba
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {page.blocks.map((block, i) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  isFirst={i === 0}
                  isLast={i === page.blocks.length - 1}
                  onChange={(patch) =>
                    updateBlocks(
                      page.id,
                      page.blocks.map((b) => (b.id === block.id ? { ...b, ...patch } : b)),
                    )
                  }
                  onRemove={() => updateBlocks(page.id, page.blocks.filter((b) => b.id !== block.id))}
                  onMove={(dir) => {
                    const next = [...page.blocks];
                    const j = i + dir;
                    if (j < 0 || j >= next.length) return;
                    [next[i], next[j]] = [next[j]!, next[i]!];
                    updateBlocks(page.id, next);
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => addBlock(page)}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
            >
              <Plus className="size-3.5" /> Adicionar bloco
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AgendaPanel({ draft, setDraft }: { draft: AppSettings; setDraft: (fn: (d: AppSettings) => AppSettings) => void }) {
  const statuses = draft.agendaStatuses;

  function update(i: number, patch: Partial<AgendaStatus>) {
    setDraft((d) => ({
      ...d,
      agendaStatuses: d.agendaStatuses.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }

  function add() {
    setDraft((d) => ({
      ...d,
      agendaStatuses: [...d.agendaStatuses, { id: `status-${uid()}`, name: "Novo status", color: "#64748B" }],
    }));
  }

  function remove(i: number) {
    setDraft((d) => ({ ...d, agendaStatuses: d.agendaStatuses.filter((_, idx) => idx !== i) }));
  }

  return (
    <Panel title="Agenda" description="Status usados nos eventos e lançamentos da agenda" delay={0.2} className="xl:col-span-2">
      <div className="flex flex-col gap-2">
        {statuses.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5">
            <input
              type="color"
              value={s.color}
              onChange={(e) => update(i, { color: e.target.value })}
              aria-label={`Cor de ${s.name}`}
              className="size-9 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
            />
            <input
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
              maxLength={24}
              className="min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remover status ${s.name}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
        >
          <Plus className="size-3.5" /> Adicionar status
        </button>
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, agendaStatuses: DEFAULT_AGENDA_STATUSES }))}
          className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
        >
          Restaurar padrão
        </button>
      </div>
    </Panel>
  );
}

function SettingsPage() {
  const { settings, saveSettings, syncing } = useFinance();
  const { user, name } = useAuth();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDraft(settings), [settings]);

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.appName.trim()) {
      setError("Informe o nome do aplicativo.");
      return;
    }
    const clean: AppSettings = {
      ...draft,
      appName: draft.appName.trim(),
      tagline: draft.tagline.trim(),
      greeting: draft.greeting.trim() || "Olá",
      labels: {
        dashboard: draft.labels.dashboard.trim() || DEFAULT_SETTINGS.labels.dashboard,
        contas: draft.labels.contas.trim() || DEFAULT_SETTINGS.labels.contas,
        relatorios: draft.labels.relatorios.trim() || DEFAULT_SETTINGS.labels.relatorios,
        metas: draft.labels.metas.trim() || DEFAULT_SETTINGS.labels.metas,
      },
    };
    await saveSettings(clean);
    setSaved(true);
  }

  return (
    <Page title="Configurações" subtitle="Preferências da sua conta" requireData={false}>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5">
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Identidade" description="Como o app se apresenta para você">
            <div className="flex flex-col gap-4">
              <Field label="Nome do aplicativo" value={draft.appName} onChange={(v) => set("appName", v)} />
              <Field label="Frase de apoio" value={draft.tagline} onChange={(v) => set("tagline", v)} />
              <Field label="Saudação" value={draft.greeting} onChange={(v) => set("greeting", v)} maxLength={30} />
              <p className="text-xs text-muted-foreground">
                Prévia: <span className="text-foreground">{draft.greeting || "Olá"}{name ? `, ${name}` : ""}</span>
                {user?.email ? ` · ${user.email}` : ""}
              </p>
            </div>
          </Panel>

          <Panel title="Aparência" description="Cor de destaque e densidade" delay={0.05}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Cor de destaque
                </span>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => set("accent", a.id)}
                      aria-label={a.label}
                      aria-pressed={draft.accent === a.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                        draft.accent === a.id
                          ? "border-primary text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="size-3.5 rounded-full" style={{ background: a.color }} />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Densidade
                </span>
                <div className="flex flex-wrap gap-2">
                  {(["confortavel", "compacta"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set("density", d)}
                      aria-pressed={draft.density === d}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                        draft.density === d
                          ? "border-primary text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {d === "confortavel" ? "Confortável" : "Compacta"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {(
                  [
                    ["showInsights", "Mostrar insights no dashboard"],
                    ["showGoal", "Mostrar meta no dashboard"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draft[key]}
                      onChange={(e) => set(key, e.target.checked)}
                      className="size-4 rounded border-input accent-[var(--color-primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Rótulos do menu" description="Renomeie as seções como preferir" delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["dashboard", "Dashboard"],
                  ["contas", "Contas"],
                  ["relatorios", "Relatórios"],
                  ["metas", "Metas"],
                ] as const
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={draft.labels[key]}
                  maxLength={24}
                  onChange={(v) => setDraft((d) => ({ ...d, labels: { ...d.labels, [key]: v } }))}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Dados de contato" description="Aparecem nas informações copiadas" delay={0.15}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome / empresa" value={draft.companyName} onChange={(v) => set("companyName", v)} />
              <Field label="E-mail" value={draft.companyEmail} onChange={(v) => set("companyEmail", v)} />
              <Field label="Telefone" value={draft.companyPhone} onChange={(v) => set("companyPhone", v)} maxLength={30} />
              <Field label="Observação" value={draft.companyNote} onChange={(v) => set("companyNote", v)} maxLength={120} />
            </div>
          </Panel>

          <TypographyPanel draft={draft} setDraft={setDraft} />
          <NavPanel draft={draft} setDraft={setDraft} />
          <PagesPanel draft={draft} setDraft={setDraft} />
          <AgendaPanel draft={draft} setDraft={setDraft} />
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={syncing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {syncing && <Loader2 className="size-4 animate-spin" />} Salvar configurações
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_SETTINGS);
              setSaved(false);
            }}
            className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/60"
          >
            Restaurar padrão
          </button>
          {saved && !syncing && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <Check className="size-4" /> Configurações salvas
            </span>
          )}
        </div>

        <p className="pt-2 text-center text-xs text-muted-foreground/70">
          Criado por Victor Souza de Aguiar.
        </p>
      </form>

    </Page>
  );
}
