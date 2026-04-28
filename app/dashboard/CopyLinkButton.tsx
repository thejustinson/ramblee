"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopyLinkButton({ joinCode, className = "" }: { joinCode: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault(); // Don't trigger parent Link click
    e.stopPropagation();
    const url = `${window.location.origin}/join?code=${joinCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy shareable link"}
      className={`flex items-center gap-1.5 font-mono text-xs transition-colors ${
        copied
          ? "text-status-correct"
          : "text-brand-muted hover:text-brand-white"
      } ${className}`}
    >
      {copied ? (
        <><Check className="w-3.5 h-3.5" />Copied!</>
      ) : (
        <><Link2 className="w-3.5 h-3.5" />Share</>
      )}
    </button>
  );
}
