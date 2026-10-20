import { useEffect, useState } from "react";

import { Icon } from "./Icon";
import { useToast } from "./Toasts";

/** Copies text, and says so for a moment. */
export function CopyButton({
  text,
  label = "Copy",
  className = "button button--quiet button--small",
  toast: toastMessage,
}: {
  text: string;
  label?: string;
  className?: string;
  /** A toast to show as well, for copies whose button scrolls away. */
  toast?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          if (toastMessage) toast(toastMessage, "success");
        } catch {
          toast("Couldn't reach the clipboard.", "error");
        }
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
