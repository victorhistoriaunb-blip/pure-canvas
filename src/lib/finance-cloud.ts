import { supabase } from "@/integrations/supabase/client";
import type { AgendaEvent, ImportedWorkbook, ImportIssue, SheetSummary, Transaction } from "./finance.types";

/** Conversão entre o formato do app e as colunas da tabela na nuvem. */
export type RecordRow = {
  user_id: string;
  id: string;
  date: string;
  type: string;
  category: string;
  expense_kind: string;
  description: string;
  account: string;
  method: string;
  due_date: string;
  amount: number;
  notes: string;
  details: string;
  history: string;
  links: string;
  comments: string;
  paid_amount: number;
  payment_date: string;
  status: string;
  source: string;
  file_id: string;
  file_name: string;
  sheet: string;
  extra: Record<string, string> | null;
};

/** Chave interna usada para marcar registros na lixeira (soft delete). */
const DELETED_KEY = "__deletedAt";

const txt = (v: unknown, max = 2000) => {
  const s = v == null ? "" : String(v);
  return s.length > max ? s.slice(0, max) : s;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function extraWithFlags(t: Transaction): Record<string, string> | null {
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(t.extra ?? {})) {
    if (k === DELETED_KEY) continue;
    base[txt(k, 120)] = txt(v);
  }
  if (t.deletedAt) base[DELETED_KEY] = t.deletedAt;
  return Object.keys(base).length > 0 ? base : null;
}

export function toRow(userId: string, t: Transaction): RecordRow {
  return {
    user_id: userId,
    id: txt(t.id, 300),
    date: txt(t.date, 10),
    type: t.type === "receita" ? "receita" : "despesa",
    category: txt(t.category, 200),
    expense_kind: t.expenseKind,
    description: txt(t.description, 300),
    account: txt(t.account, 200),
    method: txt(t.method, 200),
    due_date: txt(t.dueDate, 10),
    amount: num(t.amount),
    notes: txt(t.notes),
    details: txt(t.details),
    history: txt(t.history),
    links: txt(t.links),
    comments: txt(t.comments),
    paid_amount: num(t.paidAmount),
    payment_date: txt(t.paymentDate, 10),
    status: t.status,
    source: t.source,
    file_id: txt(t.fileId, 300),
    file_name: txt(t.fileName, 300),
    sheet: txt(t.sheet, 200),
    extra: extraWithFlags(t),
  };
}

export function fromRow(r: Record<string, unknown>): Transaction {
  const s = (k: string) => String(r[k] ?? "");
  const n = (k: string) => Number(r[k] ?? 0);
  const rawExtra =
    r["extra"] && typeof r["extra"] === "object"
      ? ({ ...(r["extra"] as Record<string, string>) } as Record<string, string>)
      : null;
  const deletedAt = rawExtra?.[DELETED_KEY] ?? "";
  if (rawExtra) delete rawExtra[DELETED_KEY];
  const hasExtra = rawExtra && Object.keys(rawExtra).length > 0;
  return {
    id: s("id"),
    date: s("date"),
    type: r["type"] === "receita" ? "receita" : "despesa",
    category: s("category"),
    expenseKind:
      r["expense_kind"] === "fixa" || r["expense_kind"] === "variavel"
        ? (r["expense_kind"] as "fixa" | "variavel")
        : "nenhuma",
    description: s("description"),
    account: s("account"),
    method: s("method"),
    dueDate: s("due_date"),
    amount: n("amount"),
    notes: s("notes"),
    details: s("details"),
    history: s("history"),
    links: s("links"),
    comments: s("comments"),
    paidAmount: n("paid_amount"),
    paymentDate: s("payment_date"),
    status: (["pago", "pendente", "parcial"] as const).includes(r["status"] as never)
      ? (r["status"] as Transaction["status"])
      : "pendente",
    source: r["source"] === "planilha" ? "planilha" : "manual",
    fileId: s("file_id"),
    fileName: s("file_name"),
    sheet: s("sheet"),
    ...(hasExtra ? { extra: rawExtra as Record<string, string> } : {}),
    ...(deletedAt ? { deletedAt } : {}),
  };
}


export type WorkbookMeta = Omit<ImportedWorkbook, "transactions">;

export function fileToRow(userId: string, f: WorkbookMeta) {
  return {
    user_id: userId,
    id: f.id,
    name: f.name,
    size: f.size,
    imported_at: f.importedAt,
    sheets: f.sheets as unknown as never,
    issues: f.issues as unknown as never,
  };
}

export function fileFromRow(r: Record<string, unknown>): WorkbookMeta {
  return {
    id: String(r["id"] ?? ""),
    name: String(r["name"] ?? ""),
    size: Number(r["size"] ?? 0),
    importedAt: String(r["imported_at"] ?? ""),
    sheets: (Array.isArray(r["sheets"]) ? r["sheets"] : []) as SheetSummary[],
    issues: (Array.isArray(r["issues"]) ? r["issues"] : []) as ImportIssue[],
  };
}

const CHUNK = 400;

export async function upsertRecords(userId: string, list: Transaction[]) {
  // Remove ids repetidos: o Postgres rejeita o mesmo id duas vezes no upsert.
  const unique = [...new Map(list.map((t) => [t.id, t])).values()];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const rows = unique.slice(i, i + CHUNK).map((t) => toRow(userId, t));
    const { error } = await supabase
      .from("finance_records")
      .upsert(rows as never, { onConflict: "user_id,id" });
    if (error) throw new Error(error.message);
  }
}


export async function deleteRecords(userId: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from("finance_records")
      .delete()
      .eq("user_id", userId)
      .in("id", ids.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }
}

export async function deleteRecordsByFile(userId: string, fileId: string) {
  const { error } = await supabase
    .from("finance_records")
    .delete()
    .eq("user_id", userId)
    .eq("file_id", fileId);
  if (error) throw new Error(error.message);
}

export async function fetchAllRecords(userId: string): Promise<Transaction[]> {
  const all: Transaction[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("finance_records")
      .select("*")
      .eq("user_id", userId)
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...rows.map(fromRow));
    if (rows.length < page) break;
  }
  return all;
}

export async function fetchFiles(userId: string): Promise<WorkbookMeta[]> {
  const { data, error } = await supabase
    .from("finance_files")
    .select("*")
    .eq("user_id", userId)
    .order("imported_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(fileFromRow);
}

export async function upsertFile(userId: string, f: WorkbookMeta) {
  const { error } = await supabase
    .from("finance_files")
    .upsert(fileToRow(userId, f) as never, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
}

export async function deleteFile(userId: string, id: string) {
  const { error } = await supabase
    .from("finance_files")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchPrefs(userId: string) {
  const { data, error } = await supabase
    .from("finance_prefs")
    .select("goal, settings, layout")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as { goal: unknown; settings: unknown; layout: unknown } | null;
}

export async function savePrefs(
  userId: string,
  patch: { goal?: unknown; settings?: unknown; layout?: unknown },
) {
  const { error } = await supabase
    .from("finance_prefs")
    .upsert({ user_id: userId, ...patch } as never, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/* ------------------------------ Agenda ------------------------------ */

export function eventToRow(userId: string, e: AgendaEvent) {
  return {
    user_id: userId,
    id: txt(e.id, 300),
    date: txt(e.date, 10),
    time: txt(e.time, 5),
    title: txt(e.title, 300),
    notes: txt(e.notes),
    status_id: txt(e.statusId, 60),
    amount: num(e.amount),
    record_id: txt(e.recordId, 300),
    kind: e.kind === "lancamento" ? "lancamento" : "evento",
  };
}

export function eventFromRow(r: Record<string, unknown>): AgendaEvent {
  const s = (k: string) => String(r[k] ?? "");
  return {
    id: s("id"),
    date: s("date"),
    time: s("time"),
    title: s("title"),
    notes: s("notes"),
    statusId: s("status_id"),
    amount: Number(r["amount"] ?? 0),
    recordId: s("record_id"),
    kind: r["kind"] === "lancamento" ? "lancamento" : "evento",
  };
}

export async function fetchAgenda(userId: string): Promise<AgendaEvent[]> {
  const { data, error } = await supabase
    .from("agenda_events")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(eventFromRow);
}

export async function upsertEvent(userId: string, e: AgendaEvent) {
  const { error } = await supabase
    .from("agenda_events")
    .upsert(eventToRow(userId, e) as never, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
}

export async function deleteEvent(userId: string, id: string) {
  const { error } = await supabase
    .from("agenda_events")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
