"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./CopyCode.module.css";

type CopyCodeProps = {
  code: string;
};

/** Pill showing a code with a button that copies it to the clipboard. */
export function CopyCode({ code }: CopyCodeProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      /* clipboard blocked — the code is still visible to copy by hand */
    }
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.code}>{code}</span>
      <button
        type="button"
        className={styles.button}
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy invitation code"}
      >
        <Icon name={copied ? "check" : "copy"} size={16} />
      </button>
      <span className={styles.status} role="status">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
