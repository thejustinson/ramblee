"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()} 
      className={`flex items-center gap-2 text-brand-muted hover:text-brand-white transition-colors font-mono text-sm uppercase tracking-wider ${className}`}
    >
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );
}
