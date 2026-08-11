"use client";
import { createContext, useContext, ReactNode } from "react";
import type { useUiModes } from "../hooks/useUiModes";
import type { usePagesStorage } from "../hooks/usePagesStorage";

export type WorkspaceContextType = {
  ui: ReturnType<typeof useUiModes>;
  storage: ReturnType<typeof usePagesStorage>;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ value, children }: { value: WorkspaceContextType, children: ReactNode }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

