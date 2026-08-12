import type { ReportSnapshot } from "./report.types";

/** Converte a logo em dataURL (necessário para embutir em PDF/PPTX). */
async function loadLogo(url?: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const NAVY = "#0F172A";
const SLATE = "#475569";
const PRIMARY = "#3B82F6";
const LINE = "#E2E8F0";

const today = () =>
  new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function safeName(title: string) {
  return `pina-financas-${title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

/** Resolve a logo priorizando o upload do usuário. */
function resolveLogoUrl(snap: ReportSnapshot): string | undefined {
  return snap.profile?.logoDataUrl || snap.brand.logoUrl;
}

/** Rodapé sem crédito de autoria: nota configurada ou identidade do app/empresa. */
function footerText(snap: ReportSnapshot): string {
  const note = snap.profile?.footerNote?.trim();
  if (note) return note;
  return snap.brand.company?.trim() || snap.brand.appName;
}

function preparedByText(snap: ReportSnapshot): string {
  return snap.profile?.preparedBy?.trim() || snap.brand.company?.trim() || snap.brand.appName;
}

function effectiveTitle(snap: ReportSnapshot): string {
  return snap.profile?.reportTitle?.trim() || snap.title;
}

/** Campos de cabeçalho/capa: cliente, responsável e campos livres visíveis. */
function headerFields(snap: ReportSnapshot): { label: string; value: string }[] {
  const p = snap.profile;
  const out: { label: string; value: string }[] = [];
  if (p?.clientName?.trim()) out.push({ label: "Cliente", value: p.clientName.trim() });
  if (p?.preparedBy?.trim()) out.push({ label: "Responsável", value: p.preparedBy.trim() });
  for (const f of p?.fields ?? []) {
    if (f.visible && f.label.trim() && f.value.trim()) out.push({ label: f.label.trim(), value: f.value.trim() });
  }
  return out;
}

function section(snap: ReportSnapshot, key: "showFilters" | "showCharts" | "showTables" | "showNotes") {
  return snap.profile ? snap.profile[key] !== false : true;
}

function template(snap: ReportSnapshot) {
  return snap.profile?.template ?? "institucional";
}

/* ------------------------------- PDF ------------------------------- */

export async function exportPdf(snap: ReportSnapshot) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const logo = await loadLogo(resolveLogoUrl(snap));
  const tpl = template(snap);
  const title = effectiveTitle(snap);
  const fields = headerFields(snap);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  // Aparência por template
  const isMinimal = tpl === "minimalista";
  const isExec = tpl === "executivo";
  const bandColor = isExec ? PRIMARY : NAVY;
  const bandHeight = isMinimal ? 0 : 64;
  const headerTextColor = isMinimal ? NAVY : "#FFFFFF";
  const kpiAccent = isExec;

  const header = () => {
    if (isMinimal) {
      doc.setDrawColor(LINE);
      doc.setLineWidth(1);
      doc.line(M, 46, W - M, 46);
    } else {
      doc.setFillColor(bandColor);
      doc.rect(0, 0, W, bandHeight, "F");
    }
    if (logo) {
      try {
        doc.addImage(logo, "PNG", M, isMinimal ? 4 : 14, 36, 36);
      } catch {
        /* logo opcional */
      }
    }
    doc.setTextColor(headerTextColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(snap.brand.appName, logo ? M + 46 : M, isMinimal ? 24 : 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(isMinimal ? SLATE : "#CBD5E1");
    doc.text(snap.brand.tagline ?? "Relatório financeiro", logo ? M + 46 : M, isMinimal ? 38 : 46);
    doc.setTextColor(isMinimal ? SLATE : headerTextColor);
    doc.text(today(), W - M, isMinimal ? 24 : 40, { align: "right" });
  };

  const footer = (page: number) => {
    doc.setDrawColor(LINE);
    doc.line(M, H - 42, W - M, H - 42);
    doc.setFontSize(8);
    doc.setTextColor(SLATE);
    doc.text(footerText(snap), M, H - 28);
    doc.text(`Página ${page}`, W - M, H - 28, { align: "right" });
  };

  let page = 1;
  header();
  let y = isMinimal ? 60 : 92;

  const ensure = (needed: number) => {
    if (y + needed <= H - 60) return;
    footer(page);
    doc.addPage();
    page += 1;
    header();
    y = isMinimal ? 60 : 92;
  };

  // Capa (bloco de capa simplificado, quando habilitada)
  if (section(snap, "showFilters") || snap.profile?.showCover !== false) {
    // segue direto para título; capa completa fica no PPTX. No PDF mostramos os campos aqui.
  }

  // Título e filtros
  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, M, y);
  y += 18;
  if (snap.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(SLATE);
    doc.text(snap.subtitle, M, y);
    y += 16;
  }
  if (fields.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(SLATE);
    const text = fields.map((f) => `${f.label}: ${f.value}`).join("   •   ");
    for (const line of doc.splitTextToSize(text, W - M * 2) as string[]) {
      ensure(14);
      doc.text(line, M, y);
      y += 12;
    }
  }
  if (section(snap, "showFilters") && snap.filters.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(SLATE);
    const text = snap.filters.map((f) => `${f.label}: ${f.value}`).join("   •   ");
    for (const line of doc.splitTextToSize(text, W - M * 2) as string[]) {
      ensure(14);
      doc.text(line, M, y);
      y += 12;
    }
  }
  y += 8;

  // KPIs em cartões
  if (snap.kpis.length > 0) {
    const perRow = 3;
    const gap = 12;
    const cw = (W - M * 2 - gap * (perRow - 1)) / perRow;
    const ch = 58;
    snap.kpis.forEach((k, i) => {
      const col = i % perRow;
      if (col === 0) ensure(ch + gap);
      const x = M + col * (cw + gap);
      doc.setFillColor(kpiAccent ? "#EFF6FF" : "#F8FAFC");
      doc.setDrawColor(kpiAccent ? PRIMARY : LINE);
      doc.roundedRect(x, y, cw, ch, 6, 6, "FD");
      doc.setFontSize(8);
      doc.setTextColor(SLATE);
      doc.text(k.label.toUpperCase(), x + 10, y + 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(kpiAccent ? PRIMARY : NAVY);
      doc.text(k.value, x + 10, y + 38);
      doc.setFont("helvetica", "normal");
      if (k.hint) {
        doc.setFontSize(8);
        doc.setTextColor(SLATE);
        doc.text(k.hint, x + 10, y + 50);
      }
      if (col === perRow - 1 || i === snap.kpis.length - 1) y += ch + gap;
    });
    y += 4;
  }

  // Gráficos desenhados em vetor (barras/linhas simples e legíveis)
  if (section(snap, "showCharts")) {
    for (const chart of snap.charts) {
      const rows = chart.labels.length;
      if (rows === 0) continue;
      const h = 150;
      ensure(h + 46);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(NAVY);
      doc.text(chart.title, M, y);
      y += 10;
      const cw = W - M * 2;
      doc.setDrawColor(LINE);
      doc.setFillColor("#FFFFFF");
      doc.roundedRect(M, y, cw, h, 6, 6, "FD");

      const values = chart.series.flatMap((s) => s.values);
      const max = Math.max(1, ...values.map((v) => Math.abs(v)));
      const padX = 12;
      const padY = 14;
      const plotW = cw - padX * 2;
      const plotH = h - padY * 2 - 14;
      const groups = chart.labels.length;
      const bandW = plotW / groups;
      const palette = [PRIMARY, "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"];

      chart.series.forEach((s, si) => {
        const color = palette[si % palette.length]!;
        if (chart.type === "line") {
          doc.setDrawColor(color);
          doc.setLineWidth(1.4);
          let prev: [number, number] | null = null;
          s.values.forEach((v, i) => {
            const px = M + padX + bandW * i + bandW / 2;
            const py = y + padY + plotH - (Math.abs(v) / max) * plotH;
            if (prev) doc.line(prev[0], prev[1], px, py);
            prev = [px, py];
          });
          doc.setLineWidth(0.5);
        } else {
          const bw = Math.max(2, (bandW * 0.6) / chart.series.length);
          doc.setFillColor(color);
          s.values.forEach((v, i) => {
            const bh = (Math.abs(v) / max) * plotH;
            const px = M + padX + bandW * i + bandW * 0.2 + si * bw;
            doc.rect(px, y + padY + plotH - bh, bw, bh, "F");
          });
        }
      });

      // eixo e rótulos
      doc.setDrawColor(LINE);
      doc.line(M + padX, y + padY + plotH, M + cw - padX, y + padY + plotH);
      doc.setFontSize(6.5);
      doc.setTextColor(SLATE);
      const step = Math.ceil(groups / 14);
      chart.labels.forEach((l, i) => {
        if (i % step !== 0) return;
        doc.text(String(l).slice(0, 10), M + padX + bandW * i + bandW / 2, y + h - 8, {
          align: "center",
        });
      });
      // legenda
      chart.series.forEach((s, si) => {
        const color = palette[si % palette.length]!;
        doc.setFillColor(color);
        doc.circle(M + padX + si * 90 + 3, y + 8, 3, "F");
        doc.setTextColor(SLATE);
        doc.text(s.name, M + padX + si * 90 + 10, y + 10);
      });

      doc.setFont("helvetica", "normal");
      y += h + 18;
    }
  }

  // Tabelas
  if (section(snap, "showTables")) {
    for (const table of snap.tables) {
      ensure(80);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(NAVY);
      doc.text(table.title, M, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [table.columns],
        body: table.rows.map((r) => r.map((c) => String(c ?? ""))),
        margin: { left: M, right: M, top: isMinimal ? 60 : 92, bottom: 60 },
        styles: { fontSize: 8, cellPadding: 4, textColor: NAVY, lineColor: LINE, lineWidth: 0.3 },
        headStyles: { fillColor: bandColor, textColor: "#FFFFFF", fontStyle: "bold" },
        alternateRowStyles: { fillColor: "#F8FAFC" },
        didDrawPage: () => {
          // páginas criadas pela tabela também recebem cabeçalho/rodapé
          const current = doc.getCurrentPageInfo().pageNumber;
          if (current > page) {
            page = current;
            header();
          }
        },
      });
      const after = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
      y = (after?.finalY ?? y) + 24;
    }
  }

  if (section(snap, "showNotes") && snap.notes && snap.notes.length > 0) {
    ensure(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(NAVY);
    doc.text("Observações e insights", M, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(SLATE);
    for (const note of snap.notes) {
      for (const line of doc.splitTextToSize(`• ${note}`, W - M * 2) as string[]) {
        ensure(14);
        doc.text(line, M, y);
        y += 13;
      }
    }
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    footer(p);
  }
  doc.save(`${safeName(title)}.pdf`);
}

/* ------------------------------- PPTX ------------------------------ */

export async function exportPptx(snap: ReportSnapshot) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const logo = await loadLogo(resolveLogoUrl(snap));
  const tpl = template(snap);
  const title = effectiveTitle(snap);
  const fields = headerFields(snap);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = preparedByText(snap);
  pptx.company = snap.brand.company || snap.brand.appName;
  pptx.title = `${snap.brand.appName} · ${title}`;

  const W = 10;
  const isMinimal = tpl === "minimalista";
  const isExec = tpl === "executivo";
  const HEX = {
    navy: isExec ? "1D4ED8" : "0F172A",
    slate: "475569",
    primary: "3B82F6",
    light: isExec ? "EFF6FF" : "F8FAFC",
    line: "E2E8F0",
  };

  const chrome = (slide: ReturnType<typeof pptx.addSlide>) => {
    slide.background = { color: "FFFFFF" };
    if (!isMinimal) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: isExec ? 0.12 : 0.06, fill: { color: isExec ? HEX.navy : HEX.primary },
      });
    } else {
      slide.addShape(pptx.ShapeType.line, { x: 0, y: 0.5, w: W, h: 0, line: { color: HEX.line, width: 1 } });
    }
    if (logo) slide.addImage({ data: logo, x: 9.1, y: 4.85, w: 0.45, h: 0.45 });
    slide.addText(footerText(snap), {
      x: 0.4, y: 5.0, w: 8.5, h: 0.3, fontSize: 9, color: HEX.slate, fontFace: "Arial",
    });
  };

  const fieldsLine = fields.map((f) => `${f.label}: ${f.value}`).join("   |   ");

  // Capa
  if (snap.profile?.showCover !== false) {
    const cover = pptx.addSlide();
    cover.background = { color: isMinimal ? "FFFFFF" : HEX.navy };
    const textOnDark = !isMinimal;
    if (logo) cover.addImage({ data: logo, x: 0.6, y: 0.5, w: 0.9, h: 0.9 });
    cover.addText(snap.brand.appName, {
      x: 0.6, y: 1.6, w: 8.8, h: 0.5, fontSize: 20, color: textOnDark ? "CBD5E1" : HEX.slate, fontFace: "Arial",
    });
    cover.addText(title, {
      x: 0.6, y: 2.1, w: 8.8, h: 1, fontSize: 44, bold: true, color: textOnDark ? "FFFFFF" : HEX.navy, fontFace: "Arial",
    });
    cover.addText(snap.subtitle ?? "", {
      x: 0.6, y: 3.1, w: 8.8, h: 0.5, fontSize: 16, color: textOnDark ? "94A3B8" : HEX.slate, fontFace: "Arial",
    });
    cover.addText(
      [
        ...(fieldsLine ? [{ text: fieldsLine, options: { breakLine: true } }] : []),
        {
          text: section(snap, "showFilters")
            ? snap.filters.map((f) => `${f.label}: ${f.value}`).join("   |   ")
            : "",
          options: { breakLine: true },
        },
        { text: `Gerado em ${today()} — ${footerText(snap)}` },
      ],
      { x: 0.6, y: 4.2, w: 8.8, h: 0.9, fontSize: 11, color: textOnDark ? "94A3B8" : HEX.slate, fontFace: "Arial" },
    );
  }

  // Indicadores
  if (snap.kpis.length > 0) {
    const chunk = 6;
    for (let i = 0; i < snap.kpis.length; i += chunk) {
      const slide = pptx.addSlide();
      chrome(slide);
      slide.addText("Indicadores", {
        x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 26, bold: true, color: HEX.navy, fontFace: "Arial",
      });
      snap.kpis.slice(i, i + chunk).forEach((k, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = 0.4 + col * 3.1;
        const y = 1.1 + row * 1.7;
        slide.addShape(pptx.ShapeType.roundRect, {
          x, y, w: 2.9, h: 1.45, fill: { color: HEX.light }, line: { color: isExec ? HEX.primary : HEX.line, width: 1 },
          rectRadius: 0.08,
        });
        slide.addText(k.label.toUpperCase(), {
          x: x + 0.18, y: y + 0.15, w: 2.5, h: 0.3, fontSize: 10, color: HEX.slate, fontFace: "Arial",
        });
        slide.addText(k.value, {
          x: x + 0.18, y: y + 0.5, w: 2.5, h: 0.45, fontSize: 22, bold: true, color: isExec ? HEX.primary : HEX.navy, fontFace: "Arial",
        });
        if (k.hint)
          slide.addText(k.hint, {
            x: x + 0.18, y: y + 0.98, w: 2.5, h: 0.3, fontSize: 9, color: HEX.slate, fontFace: "Arial",
          });
      });
    }
  }

  // Gráficos nativos (editáveis no PowerPoint e no Canva)
  if (section(snap, "showCharts")) {
    for (const chart of snap.charts) {
      if (chart.labels.length === 0) continue;
      const slide = pptx.addSlide();
      chrome(slide);
      slide.addText(chart.title, {
        x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: HEX.navy, fontFace: "Arial",
      });
      const type =
        chart.type === "pie" ? pptx.ChartType.pie : chart.type === "line" ? pptx.ChartType.line : pptx.ChartType.bar;
      slide.addChart(
        type,
        chart.series.map((s) => ({ name: s.name, labels: chart.labels, values: s.values })),
        {
          x: 0.4, y: 1.0, w: 9.2, h: 3.7,
          showLegend: true, legendPos: "b", chartColors: ["3B82F6", "22C55E", "F59E0B", "EF4444", "8B5CF6"],
          catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, dataLabelFontSize: 9,
        },
      );
    }
  }

  // Tabelas (texto real, editável)
  if (section(snap, "showTables")) {
    for (const table of snap.tables) {
      const perSlide = 12;
      const rows = table.rows.length === 0 ? [table.columns.map(() => "—")] : table.rows;
      for (let i = 0; i < rows.length; i += perSlide) {
        const slide = pptx.addSlide();
        chrome(slide);
        const part = rows.length > perSlide ? ` (${Math.floor(i / perSlide) + 1})` : "";
        slide.addText(table.title + part, {
          x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: HEX.navy, fontFace: "Arial",
        });
        slide.addTable(
          [
            table.columns.map((c) => ({
              text: c,
              options: { bold: true, color: "FFFFFF", fill: { color: HEX.navy } },
            })),
            ...rows.slice(i, i + perSlide).map((r) => r.map((c) => ({ text: String(c ?? "") }))),
          ],
          {
            x: 0.4, y: 1.0, w: 9.2, fontSize: 10, fontFace: "Arial", color: HEX.navy,
            border: { type: "solid", color: HEX.line, pt: 1 },
            autoPage: false,
          },
        );
      }
    }
  }

  if (section(snap, "showNotes") && snap.notes && snap.notes.length > 0) {
    const slide = pptx.addSlide();
    chrome(slide);
    slide.addText("Observações e insights", {
      x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: HEX.navy, fontFace: "Arial",
    });
    slide.addText(
      snap.notes.map((n) => ({ text: n, options: { bullet: true, breakLine: true } })),
      { x: 0.5, y: 1.1, w: 9, h: 3.5, fontSize: 13, color: HEX.slate, fontFace: "Arial", lineSpacingMultiple: 1.3 },
    );
  }

  await pptx.writeFile({ fileName: `${safeName(title)}.pptx` });
}

/* -------------------------------- CSV ------------------------------ */

export function exportCsv(snap: ReportSnapshot) {
  const lines: string[] = [];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const title = effectiveTitle(snap);
  const fields = headerFields(snap);

  lines.push(esc(`${snap.brand.appName} — ${title}`));
  if (snap.subtitle) lines.push(esc(snap.subtitle));
  for (const f of fields) lines.push([esc(f.label), esc(f.value)].join(";"));
  if (section(snap, "showFilters")) {
    for (const f of snap.filters) lines.push([esc(f.label), esc(f.value)].join(";"));
  }
  lines.push("");
  for (const k of snap.kpis) lines.push([esc(k.label), esc(k.value)].join(";"));
  if (section(snap, "showTables")) {
    for (const t of snap.tables) {
      lines.push("");
      lines.push(esc(t.title));
      lines.push(t.columns.map(esc).join(";"));
      for (const r of t.rows) lines.push(r.map(esc).join(";"));
    }
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(title)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
