"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import ShareModal from "@/components/ShareModal";

export default function ShareButton({ 
  gameTitle, 
  joinCode, 
  questionCount, 
  reward, 
  className = "" 
}: { 
  gameTitle: string; 
  joinCode: string; 
  questionCount?: number; 
  reward?: string | null; 
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
        title="Share game"
        className={`flex items-center gap-1.5 font-mono text-xs text-brand-muted hover:text-brand-lime transition-colors ${className}`}
      >
        <Share2 className="w-3.5 h-3.5" />Share
      </button>

      <ShareModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        gameTitle={gameTitle}
        joinCode={joinCode}
        questionCount={questionCount}
        reward={reward}
      />
    </>
  );
}
