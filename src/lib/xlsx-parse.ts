import * as XLSX from "xlsx";
import type { ImportIssue, ImportedWorkbook, SheetSummary, Transaction } from "./finance.types";
import { paymentStatusOf } from "./finance.types";

/** Normaliza cabeçalho: minúsculo, sem acento, sem pontuação. */
function norm(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Campos sugeridos. NENHUM é obrigatório — o que não existir na planilha
 * simplesmente fica vazio no registro importado.
 */
const FIELD_SYNONYMS: Record<string, string[]> = {
  date: ["data", "dia", "date", "competencia", "data lancamento", "lancamento em"],
  dueDate: ["vencimento", "data vencimento", "vence em", "prazo", "data limite"],
  description: ["conta", "descricao", "historico", "item", "lancamento", "nome", "detalhe", "titulo", "produto", "cliente"],
  category: ["categoria", "classificacao", "grupo", "segmento", "setor"],
  expenseKind: ["despesa", "tipo de despesa", "tipo de gasto", "fixa variavel", "fixo variavel"],
  type: ["tipo", "natureza", "entrada saida", "movimento", "operacao", "receita despesa"],
  amount: ["valor", "montante", "total", "preco", "quantia", "valor r", "valor total", "vlr", "valor previsto"],
  account: ["banco", "carteira", "instituicao", "fornecedor"],
  method: ["forma de pagamento", "pagamento", "metodo", "forma", "meio de pagamento"],
  notes: ["observacao", "observacoes", "obs", "nota", "notas", "comentario", "detalhes"],
  details: ["detalhamento", "informacoes adicionais", "complemento"],
  status: ["status", "situacao", "pago", "quitado", "condicao"],
  paidAmount: ["valor pago", "pago valor", "valor quitado", "recebido", "valor recebido"],
  paymentDate: ["data pagamento", "data do pagamento", "pago em", "data quitacao", "data de pagamento"],

};

function matchField(header: string): string | null {
  const h = norm(header);
  if (!h) return null;
  for (const [field, options] of Object.entries(FIELD_SYNONYMS)) {
    if (options.some((o) => h === o)) return field;
  }
  for (const [field, options] of Object.entries(FIELD_SYNONYMS)) {
    if (options.some((o) => h.includes(o) || o.includes(h))) return field;
  }
  return null;
}

const RECEITA_WORDS = ["receita", "entrada", "credito", "ganho", "renda", "recebimento", "provento"];
const DESPESA_WORDS = ["despesa", "saida", "debito", "gasto", "custo", "pagamento", "gastos"];
const PAGO_WORDS = ["pago", "quitado", "recebido", "concluido", "ok", "sim", "liquidado", "finalizado"];
const PARCIAL_WORDS = ["parcial", "parcialmente"];

function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.includes("-");
  s = s.replace(/[()]/g, "").replace(/[^\d,.-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s.replace(/-/g, ""));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseDate(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
    return null;
  }
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    const year = br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3]);
    return `${year}-${pad(Number(br[2]))}-${pad(Number(br[1]))}`;
  }
  const isoLike = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (isoLike) return `${isoLike[1]}-${pad(Number(isoLike[2]))}-${pad(Number(isoLike[3]))}`;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }
  return null;
}

/**
 * Encontra a linha de cabeçalho. Como nenhuma coluna é obrigatória, usamos a
 * primeira linha com maior quantidade de rótulos preenchidos (com bônus para
 * colunas reconhecidas), garantindo que qualquer estrutura de planilha funcione.
 */
function findHeaderRow(rows: unknown[][]) {
  let best: { index: number; map: Record<string, number>; columns: string[]; labels: (string | null)[]; score: number } | null =
    null;
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] ?? [];
    const map: Record<string, number> = {};
    const columns: string[] = [];
    const labels: (string | null)[] = [];
    let filled = 0;
    row.forEach((cell, col) => {
      const label = String(cell ?? "").trim();
      labels[col] = label || null;
      if (!label) return;
      filled++;
      columns.push(label);
      const field = matchField(label);
      if (field && map[field] === undefined) map[field] = col;
    });
    const score = filled + Object.keys(map).length * 2;
    if (filled > 0 && (!best || score > best.score)) {
      best = { index: i, map, columns, labels, score };
    }
  }
  return best;
}

/** Limita textos para não estourar limites de gravação. */
const clip = (v: string, max = 500) => (v.length > max ? `${v.slice(0, max)}…` : v);

export function parseWorkbook(fileId: string, fileName: string, buffer: ArrayBuffer) {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("O arquivo está vazio.");
  }
  let wb: XLSX.WorkBook;
  try {
    // Uint8Array + type "array" é o caminho compatível com todos os navegadores.
    wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("password") || msg.includes("encrypt")) {
      throw new Error("O arquivo está protegido por senha. Remova a proteção e envie novamente.");
    }
    throw new Error(
      "Formato não suportado ou arquivo corrompido. Salve novamente como .xlsx, .xls ou .csv e tente de novo.",
    );
  }
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("A planilha não tem abas legíveis.");
  }
  const sheets: SheetSummary[] = [];
  const issues: ImportIssue[] = [];
  const transactions: Transaction[] = [];


  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    let rows: unknown[][];
    try {
      rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false });
    } catch {
      issues.push({ level: "aviso", sheet: sheetName, message: "Não foi possível ler esta aba — ela foi ignorada." });
      continue;
    }
    if (rows.length === 0) {
      // Aba vazia é ignorada silenciosamente, sem gerar erro.
      sheets.push({ name: sheetName, rows: 0, imported: 0, skipped: 0, columns: [] });
      continue;
    }

    let header = findHeaderRow(rows);
    if (!header) {
      // Estrutura totalmente diferente do esperado: importa mesmo assim, guardando
      // cada coluna como campo extra do registro, sem descartar os dados.
      header = { index: -1, map: {}, columns: [], labels: [], score: 0 };
      issues.push({
        level: "aviso",
        sheet: sheetName,
        message: "Nenhuma coluna reconhecida — os dados foram importados como informações extras de cada registro.",
      });
    }

    const { map, labels } = header;
    const usedCols = new Set(Object.values(map));
    const body = rows.slice(header.index + 1);
    const genericLabels = header.index === -1 ? (rows[0] ?? []).map((c) => String(c ?? "").trim()) : labels;
    let imported = 0;
    let empty = 0;

    body.forEach((row, i) => {
      const hasContent = row.some((c) => c !== null && String(c).trim() !== "");
      if (!hasContent) {
        empty++;
        return;
      }
      const cell = (field: string) => (map[field] === undefined ? null : row[map[field]]);
      const text = (field: string) => String(cell(field) ?? "").trim();

      const amountRaw = parseAmount(cell("amount"));
      const date = parseDate(cell("date")) ?? "";
      const typeText = norm(cell("type"));
      const categoryText = text("category");

      let type: Transaction["type"];
      if (typeText && RECEITA_WORDS.some((w) => typeText.includes(w))) type = "receita";
      else if (typeText && DESPESA_WORDS.some((w) => typeText.includes(w))) type = "despesa";
      else if (amountRaw !== null && amountRaw < 0) type = "despesa";
      else if (map.type === undefined) {
        const c = norm(categoryText);
        type = RECEITA_WORDS.some((w) => c.includes(w)) || c.includes("salario") ? "receita" : "despesa";
      } else type = "despesa";

      const amount = amountRaw === null ? 0 : Math.abs(amountRaw);
      const statusText = norm(cell("status"));
      const paidRaw = parseAmount(cell("paidAmount"));
      let paidAmount = paidRaw === null ? 0 : Math.abs(paidRaw);
      if (paidRaw === null && statusText) {
        if (PARCIAL_WORDS.some((w) => statusText.includes(w))) paidAmount = amount / 2;
        else if (PAGO_WORDS.some((w) => statusText === w || statusText.includes(w))) paidAmount = amount;
      }

      const extra: Record<string, string> = {};
      row.forEach((c, col) => {
        if (usedCols.has(col)) return;
        const label = genericLabels[col] || `Coluna ${col + 1}`;
        const value = c === null ? "" : String(c).trim();
        if (value) extra[label] = value;
      });

      const kindText = norm(text("expenseKind") || categoryText);
      const expenseKind: Transaction["expenseKind"] = kindText.includes("fix")
        ? "fixa"
        : kindText.includes("variav")
          ? "variavel"
          : "nenhuma";

      transactions.push({
        id: `${fileId}:${sheetName}:${i}`,
        date,
        type,
        category: categoryText,
        expenseKind,
        description: text("description") || categoryText || `Registro ${i + 1}`,
        account: text("account"),
        method: text("method"),
        dueDate: parseDate(cell("dueDate")) ?? "",
        amount,
        notes: text("notes"),
        details: text("details"),
        history: "",
        links: "",
        comments: "",
        paidAmount,
        paymentDate: parseDate(cell("paymentDate")) ?? "",
        status: paymentStatusOf(amount, paidAmount),

        source: "planilha",
        fileId,
        fileName,
        sheet: sheetName,
        ...(Object.keys(extra).length > 0 ? { extra } : {}),
      });
      imported++;
    });

    sheets.push({
      name: sheetName,
      rows: body.length,
      imported,
      skipped: empty,
      columns: header.columns,
    });

    const missing = (["date", "amount", "category", "type"] as const).filter((f) => map[f] === undefined);
    if (missing.length > 0 && header.index !== -1) {
      const names: Record<string, string> = {
        date: "Data",
        amount: "Valor",
        category: "Categoria",
        type: "Tipo",
      };
      issues.push({
        level: "aviso",
        sheet: sheetName,
        message: `Colunas sugeridas não encontradas (${missing.map((m) => names[m]).join(", ")}). Os registros foram importados mesmo assim, com esses campos vazios — você pode preenchê-los editando cada registro.`,
      });
    }
    if (imported === 0 && body.length > 0)
      issues.push({ level: "aviso", sheet: sheetName, message: "Nenhuma linha com conteúdo nesta aba." });
  }

  const workbook: ImportedWorkbook = {
    id: fileId,
    name: fileName,
    size: buffer.byteLength,
    importedAt: new Date().toISOString(),
    sheets,
    issues,
    transactions,
  };
  return workbook;
}

export async function parseFile(file: File): Promise<ImportedWorkbook> {
  const buffer = await file.arrayBuffer();
  const id = `${file.name}`;
  return parseWorkbook(id, file.name, buffer);
}
