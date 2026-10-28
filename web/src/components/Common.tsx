import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { DecisionStatus } from "@shared/types";
import { STATUS_META } from "../lib/format";

export function StatusChip({ status }: { status: DecisionStatus }) {
  return <span className={`status status-${status}`}>{STATUS_META[status].label}</span>;
}

export function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "moss" | "ochre" | "clay" | "slate" | "outline";
  title?: string;
}) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "secondary", size = "md", className = "", ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} />;
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  required = false,
  full = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field ${full ? "field-full" : ""}`}>
      <span className="field-label">
        {label}
        {required && <span className="req" aria-label="required"> *</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Section({
  index,
  title,
  subtitle,
  actions,
  children,
}: {
  index: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <header className="card-head">
        <div className="card-title-block">
          <span className="eyebrow">{index}</span>
          <h2>{title}</h2>
          {subtitle && <p className="card-sub">{subtitle}</p>}
        </div>
        {actions && <div className="card-actions">{actions}</div>}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function InlineNote({ tone = "neutral", children }: { tone?: "neutral" | "ochre" | "clay" | "moss"; children: ReactNode }) {
  return <div className={`inline-note note-${tone}`}>{children}</div>;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="form-error" role="alert">{message}</div>;
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="error-block">
      <span className="eyebrow">Request failed</span>
      <h2>The record could not be loaded</h2>
      <p>{message}</p>
      <Button variant="secondary" onClick={() => window.location.reload()}>
        Reload workspace
      </Button>
    </div>
  );
}
