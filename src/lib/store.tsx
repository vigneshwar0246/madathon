"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { initialData } from "./demo-data";
import { isSupabaseConfigured } from "./supabase/client";
import type { AppData, Audit, Bug, Project, Task, TimeEntry, WorkspaceIdentity } from "./types";

const STORAGE_KEY = "vetra-frontend-demo-v1";
const emptyData: AppData = { projects: [], tasks: [], bugs: [], time: [], employees: [], notices: [], audits: [] };
type Entity = Project | Task | Bug | TimeEntry;
type Collection = "projects" | "tasks" | "bugs" | "time";
type Store = { data: AppData; ready: boolean; mode: "demo" | "live"; identity: WorkspaceIdentity | null; error: string; clearError: () => void; add: (collection: Collection, item: Entity) => Promise<boolean>; update: (collection: Collection, id: string, patch: object) => Promise<boolean>; audit: (action: string, subject: string) => void; refresh: () => Promise<void>; reset: () => void };
const Context = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const mode = isSupabaseConfigured ? "live" : "demo";
  const [data, setData] = useState<AppData>(mode === "live" ? emptyData : initialData);
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<WorkspaceIdentity | null>(null);
  const [error, setError] = useState("");
  const currentData = useRef<AppData>(mode === "live" ? emptyData : initialData);
  const refresh = useCallback(async () => {
    if (mode === "demo") return;
    const response = await fetch("/api/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
    if (response.status === 401) { window.location.assign("/login"); return; }
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not load workspace");
    if (body.needsOnboarding) { window.location.assign("/onboarding"); return; }
    currentData.current = body.data as AppData;
    setData(body.data as AppData);
    setIdentity(body.identity as WorkspaceIdentity);
  }, [mode]);
  useEffect(() => {
    if (mode === "live") {
      refresh().catch(caught => setError(caught instanceof Error ? caught.message : "Could not load workspace")).finally(() => setReady(true));
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        currentData.current = JSON.parse(saved) as AppData;
        setData(currentData.current);
      }
    } catch { /* Corrupt local preview data falls back to the sample. */ }
    setReady(true);
  }, [mode, refresh]);
  const commit = (change: (data: AppData) => AppData) => {
    const next = change(currentData.current);
    currentData.current = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setData(next);
  };

  const remoteAction = async (path: string, method: string, payload: object) => {
    if (!identity) { setError("Workspace is still loading"); return false; }
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json", "x-organisation-id": identity.organisationId }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Action failed");
      await refresh();
      setError("");
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed"); return false; }
  };
  const add = async (collection: Collection, item: Entity) => {
    if (mode === "demo") { commit(current => ({ ...current, [collection]: [...current[collection], item] })); return true; }
    const path = { projects: "/api/projects", tasks: "/api/tasks", bugs: "/api/bugs", time: "/api/time-entries" }[collection];
    return remoteAction(path, "POST", item);
  };
  const update = async (collection: Collection, id: string, patch: object) => {
    if (mode === "demo") { commit(current => ({ ...current, [collection]: (current[collection] as Entity[]).map(item => item.id === id ? { ...item, ...patch } : item) })); return true; }
    if (collection === "bugs" && "review" in patch) return remoteAction("/api/reviews", "POST", { bugId: id, decision: patch.review, reason: "reason" in patch ? patch.reason : "" });
    const path = { projects: "/api/projects", tasks: "/api/tasks", bugs: "/api/bugs", time: "/api/time-entries" }[collection];
    return remoteAction(path, "PATCH", { id, ...patch });
  };
  const audit = (action: string, subject: string) => {
    if (mode === "live") return;
    const entry: Audit = { id: `AUD-${Date.now()}`, actor: "Demo manager", action, subject, date: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) };
    commit(current => ({ ...current, audits: [entry, ...current.audits] }));
  };
  const reset = () => { if (mode === "live") return; currentData.current = initialData; setData(initialData); localStorage.removeItem(STORAGE_KEY); };
  return <Context.Provider value={{ data, ready, mode, identity, error, clearError: () => setError(""), add, update, audit, refresh, reset }}>{children}</Context.Provider>;
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider is missing");
  return store;
}
