import { useEffect, useRef, useState } from "react";

/**
 * Campos de edição rápida (inline). Clique no valor → vira input →
 * salva ao perder o foco ou com Enter. Esc cancela.
 */

const trigger =
  "w-full cursor-text rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-surface/70 hover:ring-1 hover:ring-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const input =
  "w-full rounded-md border border-primary/60 bg-background px-1.5 py-1 text-inherit outline-none ring-2 ring-ring/25";

function useCommit(value: string, onSave: (v: string) => void) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);
  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };
  return { editing, setEditing, draft, setDraft, commit, ref };
}

export function InlineText({
  value,
  onSave,
  placeholder = "—",
  label,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  const { editing, setEditing, draft, setDraft, commit, ref } = useCommit(value, onSave);
  if (!editing)
    return (
      <button type="button" aria-label={`Editar ${label}`} onClick={() => setEditing(true)} className={`${trigger} ${className}`}>
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </button>
    );
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      value={draft}
      maxLength={160}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={`${input} ${className}`}
    />
  );
}

export function InlineDate({
  value,
  onSave,
  label,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  label: string;
  className?: string;
}) {
  const { editing, setEditing, draft, setDraft, commit, ref } = useCommit(value, onSave);
  if (!editing)
    return (
      <button type="button" aria-label={`Editar ${label}`} onClick={() => setEditing(true)} className={`${trigger} ${className}`}>
        {value ? (
          new Date(`${value}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </button>
    );
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="date"
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={`${input} ${className}`}
    />
  );
}

export function InlineMoney({
  value,
  onSave,
  label,
  className = "",
}: {
  value: number;
  onSave: (v: number) => void;
  label: string;
  className?: string;
}) {
  const asText = value ? String(value) : "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asText);
  useEffect(() => {
    if (!editing) setDraft(asText);
  }, [asText, editing]);
  const commit = () => {
    setEditing(false);
    const n = Number(String(draft).replace(/\./g, "").replace(",", "."));
    const next = Number.isFinite(n) ? Math.abs(n) : 0;
    if (next !== value) onSave(next);
  };
  if (!editing)
    return (
      <button type="button" aria-label={`Editar ${label}`} onClick={() => setEditing(true)} className={`${trigger} ${className}`}>
        {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </button>
    );
  return (
    <input
      autoFocus
      inputMode="decimal"
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(asText);
          setEditing(false);
        }
      }}
      className={`${input} ${className}`}
    />
  );
}

export function InlineSelect({
  value,
  options,
  onSave,
  label,
  children,
  className = "",
}: {
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);
  if (!editing)
    return (
      <button type="button" aria-label={`Editar ${label}`} onClick={() => setEditing(true)} className={`${trigger} ${className}`}>
        {children ?? options.find((o) => o.value === value)?.label ?? "—"}
      </button>
    );
  return (
    <select
      ref={ref}
      value={value}
      aria-label={label}
      onChange={(e) => {
        onSave(e.target.value);
        setEditing(false);
      }}
      onBlur={() => setEditing(false)}
      className={`${input} ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
