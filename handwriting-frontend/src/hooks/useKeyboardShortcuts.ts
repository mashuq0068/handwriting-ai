import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutsOptions {
  selectedItemIds: Set<string>;
  allItemIds: string[];
  onDelete: (ids: string[]) => void;
  onDeselect: () => void;
  onSelectAll: () => void;
  onDuplicate: (id: string) => void;
}

export function useKeyboardShortcuts({
  selectedItemIds,
  allItemIds,
  onDelete,
  onDeselect,
  onSelectAll,
  onDuplicate,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      // Delete / Backspace — delete selected items
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemIds.size > 0) {
        e.preventDefault();
        onDelete(Array.from(selectedItemIds));
        return;
      }

      // Escape — deselect
      if (e.key === "Escape") {
        e.preventDefault();
        onDeselect();
        return;
      }

      // Cmd+A — select all
      if (mod && e.key === "a") {
        e.preventDefault();
        onSelectAll();
        return;
      }

      // Cmd+D — duplicate
      if (mod && e.key === "d" && selectedItemIds.size === 1) {
        e.preventDefault();
        onDuplicate(Array.from(selectedItemIds)[0]);
        return;
      }
    },
    [selectedItemIds, allItemIds, onDelete, onDeselect, onSelectAll, onDuplicate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
