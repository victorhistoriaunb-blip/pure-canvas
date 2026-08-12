import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { idbGet, idbSet } from "./idb";
import { parseFile } from "./xlsx-parse";
import { useAuth } from "./auth-context";
import {
  deleteFile,
  deleteRecords,
  deleteRecordsByFile,
  fetchAllRecords,
  fetchFiles,
  fetchPrefs,
  fetchAgenda,
  upsertEvent,
  deleteEvent,
  savePrefs,
  upsertFile,
  upsertRecords,
  type WorkbookMeta,
} from "./finance-cloud";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_SETTINGS,
  normalizeSettings,
  paymentStatusOf,
  type AgendaEvent,
  type AppSettings,
  type DashboardCardPref,
  type Goal,
  type ImportedWorkbook,
  type NewTransaction,
  type Transaction,
} from "./finance.types";

const FILES_KEY = "workbooks";
const RECORDS_KEY = "records";
const GOAL_KEY = "goal";
const SETTINGS_KEY = "settings";
const LAYOUT_KEY = "dashboard-layout";
const MIGRATED_KEY = "migrated-to-cloud";

const DEFAULT_GOAL: Goal = { name: "Reserva de emergência", target: 30000 };

type Ctx = {
  ready: boolean;
  syncing: boolean;
  error: string | null;
  files: ImportedWorkbook[];
  transactions: Transaction[];
  /** Registros na lixeira (excluídos, mas recuperáveis). */
  deletedRecords: Transaction[];
  goal: Goal;
  settings: AppSettings;
  layout: DashboardCardPref[];
  importFiles: (files: File[]) => Promise<{ name: string; error?: string }[]>;
  removeFile: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  saveLayout: (layout: DashboardCardPref[]) => Promise<void>;
  addRecord: (data: NewTransaction) => Promise<Transaction>;
  addRecords: (list: NewTransaction[]) => Promise<void>;
  updateRecord: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  restoreRecord: (id: string) => Promise<void>;
  purgeRecord: (id: string) => Promise<void>;
  purgeAllDeleted: () => Promise<void>;
  /** Exclusão em massa (vai para a lixeira). */
  deleteMany: (ids: string[]) => Promise<void>;
  restoreMany: (ids: string[]) => Promise<void>;
  /** Compromissos da agenda vinculados à conta. */
  agenda: AgendaEvent[];
  saveEvent: (event: AgendaEvent) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
};

const FinanceContext = createContext<Ctx | null>(null);

/** Garante que registros antigos (versões anteriores) ganhem os novos campos. */
function normalizeRecord(t: Partial<Transaction> & { id: string }): Transaction {
  const amount = Number(t.amount ?? 0);
  const paidAmount = Number(t.paidAmount ?? 0);
  const kind = t.expenseKind;
  return {
    id: t.id,
    date: t.date ?? "",
    type: t.type === "receita" ? "receita" : "despesa",
    category: t.category ?? "",
    expenseKind: kind === "fixa" || kind === "variavel" ? kind : "nenhuma",
    description: t.description ?? "",
    account: t.account ?? "",
    method: t.method ?? "",
    dueDate: t.dueDate ?? "",
    amount,
    notes: t.notes ?? "",
    details: t.details ?? "",
    history: t.history ?? "",
    links: t.links ?? "",
    comments: t.comments ?? "",
    paidAmount,
    paymentDate: t.paymentDate ?? "",
    status: t.status ?? paymentStatusOf(amount, paidAmount),
    source: t.source ?? (t.fileId ? "planilha" : "manual"),
    fileId: t.fileId ?? "",
    fileName: t.fileName ?? "",
    sheet: t.sheet ?? "",
    ...(t.extra ? { extra: t.extra } : {}),
    ...(t.deletedAt ? { deletedAt: t.deletedAt } : {}),
  };
}

const newId = (prefix: string, i = 0) =>
  `${prefix}:${Date.now()}:${i}:${Math.random().toString(36).slice(2, 8)}`;

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileMetas, setFileMetas] = useState<WorkbookMeta[]>([]);
  const [records, setRecords] = useState<Transaction[]>([]);
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [layout, setLayout] = useState<DashboardCardPref[]>(DEFAULT_DASHBOARD_LAYOUT);
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const recordsRef = useRef<Transaction[]>([]);
  recordsRef.current = records;

  /** Roda uma escrita na nuvem sinalizando estado e capturando falhas. */
  const run = useCallback(async (fn: () => Promise<void>) => {
    setSyncing(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError("Não foi possível salvar na nuvem. Verifique sua conexão e tente novamente.");
    } finally {
      setSyncing(false);
    }
  }, []);

  // Carrega os dados da conta e migra o que existia só neste navegador.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setReady(false);
    (async () => {
      try {
        const [cloudRecords, cloudFiles, prefs, cloudAgenda] = await Promise.all([
          fetchAllRecords(userId),
          fetchFiles(userId),
          fetchPrefs(userId),
          fetchAgenda(userId).catch(() => [] as AgendaEvent[]),
        ]);
        if (!alive) return;
        setAgenda(cloudAgenda);

        let finalRecords = cloudRecords.map(normalizeRecord);
        let finalFiles = cloudFiles;
        let finalGoal = (prefs?.goal as Goal | null) ?? DEFAULT_GOAL;
        let finalSettings = prefs?.settings as Partial<AppSettings> | null;
        let finalLayout = (prefs?.layout as DashboardCardPref[] | null) ?? null;

        // Migração única do armazenamento local para a conta.
        const migrated = await idbGet<boolean>(MIGRATED_KEY).catch(() => undefined);
        if (!migrated && finalRecords.length === 0) {
          const [localRecords, localFiles, localGoal, localSettings, localLayout] =
            await Promise.all([
              idbGet<Transaction[]>(RECORDS_KEY).catch(() => undefined),
              idbGet<ImportedWorkbook[]>(FILES_KEY).catch(() => undefined),
              idbGet<Goal>(GOAL_KEY).catch(() => undefined),
              idbGet<Partial<AppSettings>>(SETTINGS_KEY).catch(() => undefined),
              idbGet<DashboardCardPref[]>(LAYOUT_KEY).catch(() => undefined),
            ]);
          const legacy = (
            localRecords ?? localFiles?.flatMap((f) => f.transactions) ?? []
          ).map(normalizeRecord);
          if (legacy.length > 0) {
            await upsertRecords(userId, legacy);
            finalRecords = legacy;
          }
          if (localFiles && localFiles.length > 0) {
            const metas = localFiles.map(({ transactions: _drop, ...meta }) => meta);
            for (const meta of metas) await upsertFile(userId, meta);
            finalFiles = metas;
          }
          if (localGoal || localSettings || localLayout) {
            await savePrefs(userId, {
              ...(localGoal ? { goal: localGoal } : {}),
              ...(localSettings ? { settings: localSettings } : {}),
              ...(localLayout ? { layout: localLayout } : {}),
            });
            if (localGoal) finalGoal = localGoal;
            if (localSettings) finalSettings = localSettings;
            if (localLayout) finalLayout = localLayout;
          }
          await idbSet(MIGRATED_KEY, true).catch(() => undefined);
        }

        if (!alive) return;
        setRecords(finalRecords);
        setFileMetas(finalFiles);
        setGoal(finalGoal);
        setSettings(normalizeSettings(finalSettings));
        if (finalLayout && finalLayout.length > 0) {
          const known = new Map(finalLayout.map((c) => [c.id, c]));
          setLayout([
            ...finalLayout.filter((c) => DEFAULT_DASHBOARD_LAYOUT.some((d) => d.id === c.id)),
            ...DEFAULT_DASHBOARD_LAYOUT.filter((d) => !known.has(d.id)),
          ]);
        }
      } catch {
        if (alive) setError("Não foi possível carregar seus dados agora. Tente atualizar a página.");
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const importFiles = useCallback<Ctx["importFiles"]>(
    async (incoming) => {
      const results: { name: string; error?: string }[] = [];
      if (!userId) return incoming.map((f) => ({ name: f.name, error: "Sessão expirada." }));
      setSyncing(true);
      setError(null);
      let nextFiles = [...fileMetas];
      let nextRecords = [...recordsRef.current];
      for (const file of incoming) {
        if (!/\.(xlsx|xls|xlsm|csv)$/i.test(file.name)) {
          results.push({ name: file.name, error: "Formato não suportado. Use .xlsx ou .xls." });
          continue;
        }
        try {
          const workbook = await parseFile(file);
          const { transactions: rows, ...meta } = workbook;
          await deleteRecordsByFile(userId, meta.id);
          await upsertFile(userId, meta);
          await upsertRecords(userId, rows);
          nextFiles = [meta, ...nextFiles.filter((f) => f.id !== meta.id)];
          nextRecords = [...rows, ...nextRecords.filter((r) => r.fileId !== meta.id)];
          results.push({ name: file.name });
        } catch (err) {
          const detail = err instanceof Error && err.message ? err.message : "";
          results.push({
            name: file.name,
            error: detail
              ? `Falha ao importar: ${detail}`
              : "Não foi possível ler ou salvar o arquivo. Ele pode estar corrompido ou protegido por senha.",
          });
        }
      }
      setFileMetas(nextFiles);
      setRecords(nextRecords);
      setSyncing(false);
      return results;
    },
    [userId, fileMetas],
  );

  const removeFile = useCallback(
    async (id: string) => {
      setFileMetas((prev) => prev.filter((f) => f.id !== id));
      setRecords((prev) => prev.filter((r) => r.fileId !== id));
      await run(async () => {
        await deleteRecordsByFile(userId, id);
        await deleteFile(userId, id);
      });
    },
    [userId, run],
  );

  const clearAll = useCallback(async () => {
    const ids = fileMetas.map((f) => f.id);
    setFileMetas([]);
    setRecords((prev) => prev.filter((r) => r.source === "manual"));
    await run(async () => {
      for (const id of ids) {
        await deleteRecordsByFile(userId, id);
        await deleteFile(userId, id);
      }
    });
  }, [fileMetas, userId, run]);

  const saveGoal = useCallback<Ctx["saveGoal"]>(
    async (next) => {
      setGoal(next);
      await run(() => savePrefs(userId, { goal: next }));
    },
    [userId, run],
  );

  const saveSettings = useCallback<Ctx["saveSettings"]>(
    async (next) => {
      setSettings(next);
      await run(() => savePrefs(userId, { settings: next }));
    },
    [userId, run],
  );

  const saveLayout = useCallback<Ctx["saveLayout"]>(
    async (next) => {
      setLayout(next);
      await run(() => savePrefs(userId, { layout: next }));
    },
    [userId, run],
  );

  const addRecord = useCallback<Ctx["addRecord"]>(
    async (data) => {
      const record = normalizeRecord({
        ...data,
        id: newId("manual"),
        source: "manual",
        status: paymentStatusOf(data.amount, data.paidAmount),
      });
      setRecords((prev) => [record, ...prev]);
      await run(() => upsertRecords(userId, [record]));
      return record;
    },
    [userId, run],
  );

  const addRecords = useCallback<Ctx["addRecords"]>(
    async (list) => {
      const created = list.map((data, i) =>
        normalizeRecord({
          ...data,
          id: newId("manual", i),
          source: "manual",
          status: paymentStatusOf(data.amount, data.paidAmount),
        }),
      );
      if (created.length === 0) return;
      setRecords((prev) => [...created, ...prev]);
      await run(() => upsertRecords(userId, created));
    },
    [userId, run],
  );

  const updateRecord = useCallback<Ctx["updateRecord"]>(
    async (id, data) => {
      const current = recordsRef.current.find((r) => r.id === id);
      if (!current) return;
      const merged = { ...current, ...data };
      const next = normalizeRecord({
        ...merged,
        status: paymentStatusOf(merged.amount, merged.paidAmount),
      });
      setRecords((prev) => prev.map((r) => (r.id === id ? next : r)));
      await run(() => upsertRecords(userId, [next]));
    },
    [userId, run],
  );

  /** Exclusão suave: o registro vai para a lixeira e pode ser restaurado. */
  const deleteRecord = useCallback<Ctx["deleteRecord"]>(
    async (id) => {
      const current = recordsRef.current.find((r) => r.id === id);
      if (!current) return;
      const next: Transaction = { ...current, deletedAt: new Date().toISOString() };
      setRecords((prev) => prev.map((r) => (r.id === id ? next : r)));
      await run(() => upsertRecords(userId, [next]));
    },
    [userId, run],
  );

  const restoreRecord = useCallback<Ctx["restoreRecord"]>(
    async (id) => {
      const current = recordsRef.current.find((r) => r.id === id);
      if (!current) return;
      const { deletedAt: _drop, ...rest } = current;
      const next = rest as Transaction;
      setRecords((prev) => prev.map((r) => (r.id === id ? next : r)));
      await run(() => upsertRecords(userId, [next]));
    },
    [userId, run],
  );

  const purgeRecord = useCallback<Ctx["purgeRecord"]>(
    async (id) => {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      await run(() => deleteRecords(userId, [id]));
    },
    [userId, run],
  );

  const purgeAllDeleted = useCallback<Ctx["purgeAllDeleted"]>(async () => {
    const ids = recordsRef.current.filter((r) => r.deletedAt).map((r) => r.id);
    if (ids.length === 0) return;
    setRecords((prev) => prev.filter((r) => !r.deletedAt));
    await run(() => deleteRecords(userId, ids));
  }, [userId, run]);

  const deleteMany = useCallback<Ctx["deleteMany"]>(
    async (ids) => {
      const stamp = new Date().toISOString();
      const set = new Set(ids);
      const next = recordsRef.current
        .filter((r) => set.has(r.id) && !r.deletedAt)
        .map((r) => ({ ...r, deletedAt: stamp }));
      if (next.length === 0) return;
      setRecords((prev) => prev.map((r) => (set.has(r.id) && !r.deletedAt ? { ...r, deletedAt: stamp } : r)));
      await run(() => upsertRecords(userId, next));
    },
    [userId, run],
  );

  const restoreMany = useCallback<Ctx["restoreMany"]>(
    async (ids) => {
      const set = new Set(ids);
      const next = recordsRef.current
        .filter((r) => set.has(r.id) && r.deletedAt)
        .map(({ deletedAt: _drop, ...rest }) => rest as Transaction);
      if (next.length === 0) return;
      setRecords((prev) =>
        prev.map((r) => {
          if (!set.has(r.id) || !r.deletedAt) return r;
          const { deletedAt: _d, ...rest } = r;
          return rest as Transaction;
        }),
      );
      await run(() => upsertRecords(userId, next));
    },
    [userId, run],
  );

  const saveEvent = useCallback<Ctx["saveEvent"]>(
    async (event) => {
      setAgenda((prev) => {
        const exists = prev.some((e) => e.id === event.id);
        return exists ? prev.map((e) => (e.id === event.id ? event : e)) : [...prev, event];
      });
      await run(() => upsertEvent(userId, event));
    },
    [userId, run],
  );

  const removeEvent = useCallback<Ctx["removeEvent"]>(
    async (id) => {
      setAgenda((prev) => prev.filter((e) => e.id !== id));
      await run(() => deleteEvent(userId, id));
    },
    [userId, run],
  );

  const byDateDesc = (a: Transaction, b: Transaction) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

  const transactions = useMemo(
    () => records.filter((r) => !r.deletedAt).sort(byDateDesc),
    [records],
  );

  const deletedRecords = useMemo(
    () =>
      records
        .filter((r) => r.deletedAt)
        .sort((a, b) => (a.deletedAt! < b.deletedAt! ? 1 : -1)),
    [records],
  );

  const files = useMemo<ImportedWorkbook[]>(
    () =>
      fileMetas.map((meta) => ({
        ...meta,
        transactions: records.filter((r) => r.fileId === meta.id && !r.deletedAt),
      })),
    [fileMetas, records],
  );

  const value = useMemo(
    () => ({
      ready,
      syncing,
      error,
      files,
      transactions,
      deletedRecords,
      goal,
      settings,
      layout,
      importFiles,
      removeFile,
      clearAll,
      saveGoal,
      saveSettings,
      saveLayout,
      addRecord,
      addRecords,
      updateRecord,
      deleteRecord,
      restoreRecord,
      purgeRecord,
      purgeAllDeleted,
      deleteMany,
      restoreMany,
      agenda,
      saveEvent,
      removeEvent,
    }),
    [
      ready,
      syncing,
      error,
      files,
      transactions,
      deletedRecords,
      goal,
      settings,
      layout,
      importFiles,
      removeFile,
      clearAll,
      saveGoal,
      saveSettings,
      saveLayout,
      addRecord,
      addRecords,
      updateRecord,
      deleteRecord,
      restoreRecord,
      purgeRecord,
      purgeAllDeleted,
      deleteMany,
      restoreMany,
      agenda,
      saveEvent,
      removeEvent,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance precisa estar dentro de FinanceProvider");
  return ctx;
}
