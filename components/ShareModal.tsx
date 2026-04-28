"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Download, Copy, Share2, Check, Link2 } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  joinCode: string;
  questionCount?: number;
  reward?: string | null;
}

export default function ShareModal({ isOpen, onClose, gameTitle, joinCode, questionCount, reward }: ShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = 1080;
    const h = 1080;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Top accent line
    ctx.fillStyle = "#C8FF00";
    ctx.fillRect(0, 0, w, 6);

    // RAMBLEE branding
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "left";
    ctx.fillText("RAMBLEE", 60, 70);

    // Decorative corner dots
    ctx.fillStyle = "#C8FF00";
    ctx.beginPath(); ctx.arc(w - 60, 60, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w - 80, 60, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w - 96, 60, 3, 0, Math.PI * 2); ctx.fill();

    // Main content area
    const centerY = h / 2 - 20;

    // "You're invited to" label
    ctx.font = "600 22px sans-serif";
    ctx.fillStyle = "#C8FF00";
    ctx.textAlign = "center";
    ctx.letterSpacing = "6px";
    ctx.fillText("YOU\u2019RE INVITED TO PLAY", w / 2, centerY - 160);

    // Game title (with word wrap)
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    const titleFontSize = gameTitle.length > 30 ? 52 : gameTitle.length > 20 ? 64 : 80;
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    const titleLines = wrapText(ctx, gameTitle, w - 160, titleFontSize + 8);
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, w / 2, centerY - 80 + idx * (titleFontSize + 12));
    });

    const afterTitle = centerY - 80 + titleLines.length * (titleFontSize + 12) + 40;

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 180, afterTitle);
    ctx.lineTo(w / 2 + 180, afterTitle);
    ctx.stroke();

    // Room code box
    const codeBoxY = afterTitle + 30;

    // Code background
    const codeBoxW = 500;
    const codeBoxH = 140;
    const codeBoxX = (w - codeBoxW) / 2;
    ctx.fillStyle = "rgba(200,255,0,0.06)";
    ctx.strokeStyle = "#C8FF00";
    ctx.lineWidth = 2;
    roundRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, 4);
    ctx.fill();
    ctx.stroke();

    // "ROOM CODE" label
    ctx.font = "600 18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "center";
    ctx.fillText("ROOM CODE", w / 2, codeBoxY + 40);

    // Code
    ctx.font = "bold 64px monospace";
    ctx.fillStyle = "#C8FF00";
    ctx.fillText(joinCode, w / 2, codeBoxY + 105);

    // Info badges
    const badgeY = codeBoxY + codeBoxH + 40;
    const badges: string[] = [];
    if (questionCount) badges.push(`${questionCount} Questions`);
    if (reward) badges.push(`🎁 ${reward}`);

    if (badges.length > 0) {
      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText(badges.join("  •  "), w / 2, badgeY);
    }

    // Bottom CTA
    ctx.font = "500 24px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "center";
    ctx.fillText("Join at ramblee.app/join", w / 2, h - 60);

    // Bottom accent line
    ctx.fillStyle = "#C8FF00";
    ctx.fillRect(0, h - 6, w, 6);

    setImageUrl(canvas.toDataURL("image/png"));
  }, [gameTitle, joinCode, questionCount, reward]);

  useEffect(() => {
    if (isOpen) {
      setShareUrl(`${window.location.origin}/join?code=${joinCode}`);
      // Small delay to let modal render before drawing
      requestAnimationFrame(() => generateImage());
    }
  }, [isOpen, generateImage, joinCode]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `ramblee-${joinCode}.png`;
    a.click();
  };

  const handleNativeShare = async () => {
    if (!imageUrl || !navigator.share) return;
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], `ramblee-${joinCode}.png`, { type: "image/png" });
      await navigator.share({
        title: `Join "${gameTitle}" on Ramblee!`,
        text: `Room code: ${joinCode}\n${shareUrl}`,
        files: [file],
      });
    } catch {
      // User cancelled or share API not supported — fallback to copy
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div onClick={(e) => e.stopPropagation()}
        className="relative bg-brand-surface border border-brand-border rounded-[2px] w-full max-w-lg overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <h2 className="font-display text-xl font-bold text-brand-white">Share Game</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image preview */}
        <div className="p-5">
          <div className="bg-brand-black rounded-[2px] border border-brand-border overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-auto" style={{ display: imageUrl ? "none" : "block" }} />
            {imageUrl && (
              <img src={imageUrl} alt="Share card" className="w-full h-auto" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 flex flex-col gap-3">
          {/* Share link input */}
          <div className="flex items-center gap-2 bg-brand-black border border-brand-border rounded-[2px] p-3">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-brand-white font-mono text-sm outline-none truncate"
            />
            <button onClick={handleCopyLink}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-sm font-medium transition-colors ${
                copiedLink ? "bg-status-correct/20 text-status-correct" : "bg-brand-surface text-brand-muted hover:text-brand-white"
              }`}>
              {copiedLink ? <><Check className="w-4 h-4" />Copied</> : <><Link2 className="w-4 h-4" />Copy</>}
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleDownload}
              className="py-3 px-4 border border-brand-border rounded-[2px] text-brand-white hover:bg-brand-card transition-colors flex items-center justify-center gap-2 font-medium">
              <Download className="w-4 h-4" />Download Image
            </button>
            {typeof window !== "undefined" && "share" in navigator ? (
              <button onClick={handleNativeShare}
                className="py-3 px-4 bg-brand-lime text-brand-black rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-2 font-bold">
                <Share2 className="w-4 h-4" />Share
              </button>
            ) : (
              <button onClick={handleCopyLink}
                className="py-3 px-4 bg-brand-lime text-brand-black rounded-[2px] hover:brightness-110 transition-all flex items-center justify-center gap-2 font-bold">
                <Copy className="w-4 h-4" />Copy Link
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility: wrap text into lines
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, _lineHeight: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = currentLine + " " + words[i];
    if (ctx.measureText(test).width <= maxWidth) {
      currentLine = test;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

// Utility: draw rounded rect path
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
