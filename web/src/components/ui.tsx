import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { STATUS_LABEL } from "../api";
import { useCompact } from "../hooks/useCompact";

export function Button({
  children,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "text";
}) {
  return (
    <button
      type="button"
      {...props}
      style={{
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        minHeight: variant === "text" ? 32 : 48,
        padding: variant === "text" ? "6px 0" : "14px 22px",
        border: 0,
        borderRadius: 10,
        background:
          variant === "primary"
            ? "var(--red)"
            : variant === "secondary"
              ? "var(--soft)"
              : "transparent",
        color: variant === "primary" ? "white" : "var(--ink)",
        fontSize: 14,
        fontWeight: 600,
        cursor: props.disabled ? "wait" : "pointer",
        opacity: props.disabled ? 0.55 : 1,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}
export function ActionLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 48,
        padding: "14px 22px",
        background: secondary ? "var(--soft)" : "var(--red)",
        color: secondary ? "var(--ink)" : "white",
        borderRadius: 10,
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {children}
    </Link>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 32,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: useCompact() ? 29 : 36,
            lineHeight: 1.15,
            letterSpacing: -1.2,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              marginTop: 12,
              color: "var(--muted)",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: 20,
      }}
    >
      <h2 style={{ fontSize: 23, letterSpacing: -0.5 }}>{children}</h2>
      {action}
    </div>
  );
}
export function Panel({ children }: { children: ReactNode }) {
  return (
    <section
      style={{ padding: 26, background: "var(--surface)", borderRadius: 16 }}
    >
      {children}
    </section>
  );
}
export function Stack({
  children,
  gap = 20,
}: {
  children: ReactNode;
  gap?: number;
}) {
  return <div style={{ display: "grid", gap }}>{children}</div>;
}
export function Columns({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: useCompact()
          ? "minmax(0,1fr)"
          : "minmax(0,1.5fr) minmax(270px,.85fr)",
        gap: 32,
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}
export function Note({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 10,
        background:
          tone === "warning"
            ? "#fff7e9"
            : tone === "success"
              ? "#edf7f0"
              : "var(--surface)",
        color:
          tone === "warning"
            ? "#7e5818"
            : tone === "success"
              ? "#246243"
              : "var(--muted)",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p role="alert" style={{ color: "#b72d24", fontSize: 14, lineHeight: 1.6 }}>
      {message}
    </p>
  ) : null;
}
export function StatusBadge({ status }: { status: string }) {
  const success = ["approved", "documents_ready", "funded"].includes(status),
    rejected = status === "rejected";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        whiteSpace: "nowrap",
        borderRadius: 6,
        padding: "6px 9px",
        fontSize: 12,
        color: success ? "#12774b" : rejected ? "#b72d24" : "#8c5c09",
        background: success ? "#eaf5ee" : rejected ? "#feeeeb" : "#fff3db",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "currentColor",
        }}
      />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8, fontSize: 13, fontWeight: 600 }}>
      <span>{label}</span>
      {children}
      {hint && (
        <span
          style={{
            fontWeight: 400,
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        minHeight: 52,
        padding: 16,
        border: "1px solid var(--input-border)",
        borderRadius: 10,
        background: "white",
        color: "var(--ink)",
        fontWeight: 400,
        ...props.style,
      }}
    />
  );
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        minHeight: 52,
        padding: 16,
        border: "1px solid var(--input-border)",
        borderRadius: 10,
        background: "white",
        color: "var(--ink)",
        fontWeight: 400,
        ...props.style,
      }}
    />
  );
}
export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        minHeight: 110,
        padding: 16,
        border: "1px solid var(--input-border)",
        borderRadius: 10,
        background: "white",
        fontWeight: 400,
        lineHeight: 1.5,
        resize: "vertical",
        ...props.style,
      }}
    />
  );
}
export function Check({
  children,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <input
        {...props}
        type="checkbox"
        style={{
          width: 19,
          height: 19,
          accentColor: "var(--red)",
          flexShrink: 0,
          marginTop: 1,
        }}
      />
      <span>{children}</span>
    </label>
  );
}
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl style={{ display: "grid", gap: 16, margin: 0 }}>
      {items.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            gap: 24,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <dt style={{ color: "var(--muted)" }}>{label}</dt>
          <dd
            style={{
              margin: 0,
              textAlign: "right",
              maxWidth: "70%",
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function LargeAmount({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: useCompact() ? 28 : 34,
        fontWeight: 700,
        letterSpacing: -1,
        lineHeight: 1.2,
      }}
    >
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby={titleId}
      style={{
        border: 0,
        borderRadius: 20,
        padding: 32,
        maxWidth: 620,
        width: "calc(100% - 32px)",
        maxHeight: "85vh",
        color: "var(--ink)",
        overflowY: "auto",
      }}
    >
      <button
        aria-label="Закрыть"
        onClick={onClose}
        style={{
          position: "absolute",
          right: 18,
          top: 18,
          width: 32,
          height: 32,
          border: 0,
          borderRadius: "50%",
          background: "var(--soft)",
          fontSize: 21,
          cursor: "pointer",
        }}
      >
        ×
      </button>
      <h2
        id={titleId}
        style={{ fontSize: 24, marginBottom: 24, paddingRight: 24 }}
      >
        {title}
      </h2>
      {children}
    </dialog>
  );
}
export function Muted({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <p
      style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, ...style }}
    >
      {children}
    </p>
  );
}
