export type PaymentStatus = "pago" | "pendente" | "parcial";

/** Tipo de despesa (substitui a antiga "categoria" nos cards/formulários). */
export type ExpenseKind = "fixa" | "variavel" | "nenhuma";

export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = {
  fixa: "Fixa",
  variavel: "Variável",
  nenhuma: "Nenhuma",
};

export const EXPENSE_KINDS: ExpenseKind[] = ["fixa", "variavel", "nenhuma"];

export type Transaction = {
  id: string;
  /** ISO yyyy-mm-dd — pode ficar vazio quando a planilha não tem data. */
  date: string;
  type: "receita" | "despesa";
  category: string;
  /** Tipo de despesa: fixa, variável ou nenhuma. */
  expenseKind: ExpenseKind;
  /** Nome da conta (ex.: Água, Luz, Netflix). Mantém o campo `description`. */
  description: string;
  account: string;
  method: string;
  /** Data limite de pagamento (yyyy-mm-dd). Diferente de `date` (lançamento). */
  dueDate: string;
  /** Sempre positivo. Pode ser 0 quando não informado. */
  amount: number;
  notes: string;
  /** Informações complementares (aba Detalhamento) */
  details: string;
  history: string;
  links: string;
  comments: string;
  /** Controle de pagamento */
  paidAmount: number;
  paymentDate: string;
  status: PaymentStatus;
  /** Origem */
  source: "planilha" | "manual";
  fileId: string;
  fileName: string;
  sheet: string;
  /** Colunas extras encontradas na planilha (chave = cabeçalho original) */
  extra?: Record<string, string>;
  /** Quando preenchido (ISO), o registro está na lixeira e pode ser restaurado. */
  deletedAt?: string;

};

export type NewTransaction = Omit<
  Transaction,
  "id" | "fileId" | "fileName" | "sheet" | "source" | "status"
> & { status?: PaymentStatus };

export function paymentStatusOf(amount: number, paid: number): PaymentStatus {
  if (amount <= 0) return paid > 0 ? "pago" : "pendente";
  if (paid <= 0) return "pendente";
  if (paid + 0.005 >= amount) return "pago";
  return "parcial";
}


export function remainingOf(t: Transaction) {
  return Math.max(0, Number((t.amount - t.paidAmount).toFixed(2)));
}

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  parcial: "Parcial",
};

export type ImportIssue = {
  level: "erro" | "aviso";
  sheet: string;
  message: string;
  count?: number;
};

export type SheetSummary = {
  name: string;
  rows: number;
  imported: number;
  skipped: number;
  columns: string[];
};

export type ImportedWorkbook = {
  id: string;
  name: string;
  size: number;
  importedAt: string;
  sheets: SheetSummary[];
  issues: ImportIssue[];
  transactions: Transaction[];
};

export type MonthlyPoint = {
  key: string;
  label: string;
  receitas: number;
  despesas: number;
  economia: number;
};

export type CategoryTotal = { name: string; total: number; share: number };

export type DailyPoint = { day: string; despesas: number; receitas: number };

export type Goal = { name: string; target: number };

/** Fonte tipográfica aplicada em toda a interface. */
export type FontChoice = "sistema" | "inter" | "manrope" | "sora" | "ibm-plex" | "lora";

export type Typography = {
  font: FontChoice;
  /** Escala global do texto (0.9 a 1.2). */
  scale: number;
  headingWeight: "600" | "700" | "800";
};

/** Preferência de exibição de cada aba do menu lateral. */
export type NavPref = {
  /** Id fixo da aba nativa (ex.: "dashboard") ou id da página personalizada. */
  id: string;
  label: string;
  visible: boolean;
};

/** Bloco disponível para montar uma aba personalizada. */
export type CustomBlockKind =
  | "texto"
  | "kpis"
  | "fluxo"
  | "categorias"
  | "tabela"
  | "cards"
  | "vencimentos"
  | "insights"
  | "meta";

export type CustomBlock = {
  id: string;
  kind: CustomBlockKind;
  title: string;
  /** Texto livre quando kind === "texto". */
  text?: string;
};

export type CustomPage = {
  id: string;
  name: string;
  blocks: CustomBlock[];
};

/** Status configurável usado na Agenda. */
export type AgendaStatus = { id: string; name: string; color: string };

export type AgendaEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  notes: string;
  statusId: string;
  amount: number;
  /** Lançamento financeiro vinculado, quando houver. */
  recordId: string;
  kind: "evento" | "lancamento";
};

/** Campo livre exibido no cabeçalho dos relatórios exportados. */
export type ReportField = { id: string; label: string; value: string; visible: boolean };

export type ReportTemplate = "institucional" | "minimalista" | "executivo";

export type ReportProfile = {
  /** Nome do cliente/empresa para quem o relatório é emitido. */
  clientName: string;
  reportTitle: string;
  preparedBy: string;
  template: ReportTemplate;
  /** Logo em dataURL enviada pelo usuário (substitui a logo padrão). */
  logoDataUrl: string;
  showLogo: boolean;
  showCover: boolean;
  showFilters: boolean;
  showCharts: boolean;
  showTables: boolean;
  showNotes: boolean;
  footerNote: string;
  fields: ReportField[];
};

export type AppSettings = {
  appName: string;
  tagline: string;
  greeting: string;
  currency: string;
  locale: string;
  accent: "azul" | "violeta" | "esmeralda" | "ambar" | "rosa";
  density: "confortavel" | "compacta";
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyNote: string;
  labels: {
    dashboard: string;
    contas: string;
    relatorios: string;
    metas: string;
  };
  showInsights: boolean;
  showGoal: boolean;
  typography: Typography;
  nav: NavPref[];
  pages: CustomPage[];
  agendaStatuses: AgendaStatus[];
  report: ReportProfile;
};

export const DEFAULT_TYPOGRAPHY: Typography = {
  font: "sistema",
  scale: 1,
  headingWeight: "700",
};

export const DEFAULT_AGENDA_STATUSES: AgendaStatus[] = [
  { id: "previsto", name: "Previsto", color: "#3B82F6" },
  { id: "confirmado", name: "Confirmado", color: "#22C55E" },
  { id: "atencao", name: "Atenção", color: "#F59E0B" },
  { id: "atrasado", name: "Atrasado", color: "#EF4444" },
];

export const DEFAULT_REPORT_PROFILE: ReportProfile = {
  clientName: "",
  reportTitle: "",
  preparedBy: "",
  template: "institucional",
  logoDataUrl: "",
  showLogo: true,
  showCover: true,
  showFilters: true,
  showCharts: true,
  showTables: true,
  showNotes: true,
  footerNote: "",
  fields: [],
};

/** Abas nativas que podem ser renomeadas ou ocultadas. */
export const NATIVE_TABS = [
  { id: "dashboard", label: "Dashboard", to: "/" },
  { id: "paineis", label: "Painéis", to: "/paineis" },
  { id: "contas", label: "Contas", to: "/contas" },
  { id: "agenda", label: "Agenda", to: "/agenda" },
  { id: "importar", label: "Importar Planilhas", to: "/importar" },
  { id: "analise", label: "Análise", to: "/analise" },
  { id: "relatorios", label: "Relatórios", to: "/relatorios" },
  { id: "metas", label: "Metas", to: "/metas" },
  { id: "como-usar", label: "Como usar", to: "/como-usar" },
  { id: "configuracoes", label: "Configurações", to: "/configuracoes" },
] as const;

export const DEFAULT_NAV: NavPref[] = NATIVE_TABS.map((t) => ({
  id: t.id,
  label: t.label,
  visible: true,
}));

export const DEFAULT_SETTINGS: AppSettings = {
  appName: "PINA Finanças",
  tagline: "Controle pessoal",
  greeting: "Olá",
  currency: "BRL",
  locale: "pt-BR",
  accent: "azul",
  density: "confortavel",
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  companyNote: "",
  labels: {
    dashboard: "Dashboard",
    contas: "Contas",
    relatorios: "Relatórios",
    metas: "Metas",
  },
  showInsights: true,
  showGoal: true,
  typography: DEFAULT_TYPOGRAPHY,
  nav: DEFAULT_NAV,
  pages: [],
  agendaStatuses: DEFAULT_AGENDA_STATUSES,
  report: DEFAULT_REPORT_PROFILE,
};

/** Normaliza preferências vindas da nuvem, garantindo campos novos. */
export function normalizeSettings(raw: unknown): AppSettings {
  const s = (raw ?? {}) as Partial<AppSettings>;
  const nav = Array.isArray(s.nav) && s.nav.length > 0 ? s.nav : DEFAULT_NAV;
  const known = new Set(nav.map((n) => n.id));
  const pages = Array.isArray(s.pages) ? s.pages : [];
  const merged = [
    ...nav,
    ...DEFAULT_NAV.filter((n) => !known.has(n.id)),
    ...pages.filter((p) => !known.has(p.id)).map((p) => ({ id: p.id, label: p.name, visible: true })),
  ];
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    labels: { ...DEFAULT_SETTINGS.labels, ...(s.labels ?? {}) },
    typography: { ...DEFAULT_TYPOGRAPHY, ...(s.typography ?? {}) },
    nav: merged,
    pages,
    agendaStatuses:
      Array.isArray(s.agendaStatuses) && s.agendaStatuses.length > 0
        ? s.agendaStatuses
        : DEFAULT_AGENDA_STATUSES,
    report: {
      ...DEFAULT_REPORT_PROFILE,
      ...(s.report ?? {}),
      fields: Array.isArray(s.report?.fields) ? s.report.fields : [],
    },
  };
}


export type DashboardData = {
  period: { current: string; previous: string };
  kpis: {
    balance: number;
    income: number;
    expense: number;
    savings: number;
    spentPct: number;
    savedPct: number;
    incomeChange: number;
    expenseChange: number;
    savingsChange: number;
    balanceChange: number;
  };
  goal: { name: string; target: number; saved: number; progress: number };
  monthly: MonthlyPoint[];
  categories: CategoryTotal[];
  daily: DailyPoint[];
  insights: string[];
  recent: Transaction[];
  source: string;
};

/** Preferência de exibição de um card do dashboard personalizável. */
export type DashboardCardPref = { id: string; visible: boolean; size: "pequeno" | "medio" | "grande" };

export const DASHBOARD_CARDS: { id: string; label: string; defaultSize: DashboardCardPref["size"] }[] = [
  { id: "kpi-saldo", label: "Saldo acumulado", defaultSize: "pequeno" },
  { id: "kpi-receitas", label: "Receitas do mês", defaultSize: "pequeno" },
  { id: "kpi-despesas", label: "Despesas do mês", defaultSize: "pequeno" },
  { id: "kpi-economia", label: "Economia do mês", defaultSize: "pequeno" },
  { id: "kpi-pendente", label: "Total pendente", defaultSize: "pequeno" },
  { id: "kpi-pago", label: "Total pago", defaultSize: "pequeno" },
  { id: "fluxo", label: "Receitas x Despesas", defaultSize: "grande" },
  { id: "despesa-tipo", label: "Despesas por tipo (fixa/variável)", defaultSize: "medio" },
  { id: "diario", label: "Gastos diários", defaultSize: "grande" },
  { id: "vencimentos", label: "Próximos vencimentos", defaultSize: "medio" },
  { id: "meta", label: "Meta financeira", defaultSize: "medio" },
  { id: "insights", label: "Insights", defaultSize: "medio" },
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardCardPref[] = DASHBOARD_CARDS.map((c) => ({
  id: c.id,
  visible: true,
  size: c.defaultSize,
}));
