import * as XLSX from "xlsx";

/** Cabeçalhos sugeridos do modelo base (nenhum é obrigatório). */
export const TEMPLATE_HEADERS = [
  "Data",
  "Conta",
  "Categoria",
  "Tipo",
  "Despesa",
  "Vencimento",
  "Valor",
  "Valor Pago",
  "Data Pagamento",
  "Situação",
  "Forma de Pagamento",
  "Observações",
];

const EXAMPLE_ROWS: (string | number)[][] = [
  ["05/01/2026", "Aluguel", "Moradia", "Despesa", "Fixa", "10/01/2026", 2500, 2500, "09/01/2026", "Pago", "Pix", "Contrato anual"],
  ["05/01/2026", "Energia elétrica", "Casa", "Despesa", "Variável", "15/01/2026", 320.45, 0, "", "Pendente", "Boleto", ""],
  ["05/01/2026", "Salário", "Renda", "Receita", "", "", 8000, 8000, "05/01/2026", "Recebido", "Transferência", ""],
];

const HELP_ROWS: string[][] = [
  ["Como usar este modelo"],
  [""],
  ["1. Preencha uma linha por lançamento na aba 'Lançamentos'."],
  ["2. Nenhuma coluna é obrigatória: apague as que não usar ou acrescente outras."],
  ["3. Colunas extras são preservadas e aparecem no detalhamento de cada registro."],
  ["4. Você pode criar várias abas (ex.: Janeiro, Fevereiro) — todas serão lidas."],
  [""],
  ["Significado das colunas sugeridas"],
  ["Data", "Data do lançamento (dd/mm/aaaa)."],
  ["Conta", "Nome do lançamento/conta (ex.: Aluguel, Netflix)."],
  ["Categoria", "Agrupamento usado nos gráficos (ex.: Moradia)."],
  ["Tipo", "Receita ou Despesa."],
  ["Despesa", "Fixa, Variável ou vazio."],
  ["Vencimento", "Data limite de pagamento."],
  ["Valor", "Valor total (use vírgula ou ponto)."],
  ["Valor Pago", "Quanto já foi pago — define Pago/Parcial/Pendente."],
  ["Data Pagamento", "Data em que foi pago."],
  ["Situação", "Pago, Parcial ou Pendente."],
  ["Forma de Pagamento", "Pix, Boleto, Cartão…"],
  ["Observações", "Texto livre."],
];

/** Gera o arquivo .xlsx do modelo base e devolve um Blob para download. */
export function buildTemplateBlob(): Blob {
  const wb = XLSX.utils.book_new();

  const data = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...EXAMPLE_ROWS]);
  data["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  XLSX.utils.book_append_sheet(wb, data, "Lançamentos");

  const help = XLSX.utils.aoa_to_sheet(HELP_ROWS);
  help["!cols"] = [{ wch: 24 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, help, "Instruções");

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadTemplate(fileName = "modelo-pina-financas.xlsx") {
  const url = URL.createObjectURL(buildTemplateBlob());
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
