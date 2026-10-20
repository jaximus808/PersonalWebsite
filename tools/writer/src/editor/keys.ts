// Shortcut labels for tooltips: "Mod-Shift-s" → "⌘⇧S" on a Mac, "Ctrl+Shift+S" elsewhere.

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const MAC: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥", Ctrl: "⌃", ArrowUp: "↑", ArrowDown: "↓" };
const PC: Record<string, string> = { Mod: "Ctrl", Shift: "Shift", Alt: "Alt", Ctrl: "Ctrl", ArrowUp: "Up", ArrowDown: "Down" };

export function shortcutLabel(spec: string, mac = isMac): string {
  const names = mac ? MAC : PC;
  const parts = spec.split("-").map((part) => names[part] ?? (part.length === 1 ? part.toUpperCase() : part));
  return mac ? parts.join("") : parts.join("+");
}
