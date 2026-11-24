import { Children, cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, SearchX } from "lucide-react";
import { ApiError } from "../api/client";
import { statusLabel } from "../utils/dates";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const cls = ["CONFIRMED", "COMPLETED", "ACTIVE"].includes(status)
    ? "good"
    : ["PENDING", "IN_USE", "IN_PROGRESS", "SCHEDULED"].includes(status)
      ? "warn"
      : ["CANCELLED", "REJECTED", "NO_SHOW", "EXPIRED", "INACTIVE"].includes(status)
        ? "muted"
        : "plain";
  return <span className={`status-badge ${cls}`}>{statusLabel(status)}</span>;
}
export function Loading({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div className="state-center">
      <LoaderCircle
        className="spin"
        size={20}
      />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  title = "No data available",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="state-center state-empty">
      <SearchX size={24} />
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  return (
    <div
      role="alert"
      className="alert error"
    >
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
}
export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="alert success"
    >
      <CheckCircle2 size={18} />
      <span>{children}</span>
    </div>
  );
}
export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  const labelId = useId();
  const enhancedChildren = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child as ReactElement<{ "aria-labelledby"?: string }>, {
          "aria-labelledby": labelId,
        })
      : child,
  );
  return (
    <label className="field">
      <span
        id={labelId}
        className="field-label"
      >
        {label}
      </span>
      {enhancedChildren}
      {help && <small>{help}</small>}
    </label>
  );
}
export function Panel({
  title,
  children,
  toolbar,
}: {
  title?: string;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <section className="panel">
      {(title || toolbar) && (
        <div className="panel-header">
          {title && <h2>{title}</h2>}
          {toolbar}
        </div>
      )}
      <div className="panel-content">{children}</div>
    </section>
  );
}
export function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 412) {
    return (
      <ErrorNotice
        error={
          new Error(
            "Data was modified by another session. Please reload the page to take action.",
          )
        }
      />
    );
  }
  return <ErrorNotice error={error} />;
}
export function FormActions({
  busy,
  text = "Simpan",
  cancelHref,
}: {
  busy: boolean;
  text?: string;
  cancelHref?: string;
}) {
  return (
    <div className="form-actions">
      {cancelHref && (
        <a
          className="button secondary"
          href={cancelHref}
        >
          Batal
        </a>
      )}
      <button
        className="button primary"
        type="submit"
        disabled={busy}
      >
        {busy ? "Memproses…" : text}
      </button>
    </div>
  );
}
export { DateInput } from "./date-time/DateInput";
export { DateTimeInput } from "./date-time/DateTimeInput";
export { TimeInput } from "./date-time/TimeInput";
