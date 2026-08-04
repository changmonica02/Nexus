"use client";
import { useState, useCallback } from "react";

export type UiMode = "home" | "projects" | "trash" | "quickNotes" | "todos";

export function useUiModes() {
  const [mode, setMode] = useState<UiMode>("home");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const showHome = useCallback(() => setMode("home"), []);
  const showProjects = useCallback(() => setMode("projects"), []);
  const showTrash = useCallback(() => setMode("trash"), []);
  const showQuickNotes = useCallback(() => setMode("quickNotes"), []);
  const showTodos = useCallback(() => setMode("todos"), []);

  return {
    mode,
    isHomeMode: mode === "home",
    isTrashMode: mode === "trash",
    isQuickNoteMode: mode === "quickNotes",
    isTodoMode: mode === "todos",
    isProjectsMode: mode === "projects",
    isSidebarCollapsed,
    isRightPanelCollapsed,
    isCommandPaletteOpen,
    setIsSidebarCollapsed,
    setIsRightPanelCollapsed,
    setIsCommandPaletteOpen,
    showHome,
    showProjects,
    showTrash,
    showQuickNotes,
    showTodos,
    setMode,
  };
}