"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={`badge badge-${tone.toLowerCase().replaceAll(" ", "-")}`}>{children}</span>; }
export function Avatar({ initials, color = "blue", small = false }: { initials: string; color?: string; small?: boolean }) { return <span className={`avatar avatar-${color}${small ? " avatar-small" : ""}`}>{initials}</span>; }
export function Empty({ title, description }: { title: string; description: string }) { return <div className="empty"><div className="empty-orb" /><h3>{title}</h3><p>{description}</p></div>; }
export function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal glass" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><header className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>{children}</section></div>;
}
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>; }
export function SectionHeading({ title, caption, action }: { title: string; caption?: string; action?: React.ReactNode }) { return <div className="section-heading"><div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>{action}</div>; }
export function Stat({ label, value, detail, icon, tone = "mint" }: { label: string; value: string; detail: string; icon: React.ReactNode; tone?: string }) { return <div className="stat glass"><div className={`stat-icon tone-${tone}`}>{icon}</div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-detail">{detail}</div></div>; }
