"use client";

import { useState } from "react";
import { X, Wallet, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Copy } from "lucide-react";

interface ClaimRewardModalProps {
  claimId: string;
  amount: number;
  token: string;
  position: number;
  isGuest: boolean;
  hasInAppWallet: boolean;
  onClose: () => void;
  onSuccess: (tx: string) => void;
}

const ordinal = (n: number) =>
  n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

export default function ClaimRewardModal({
  claimId,
  amount,
  token,
  position,
  isGuest,
  hasInAppWallet,
  onClose,
  onSuccess,
}: ClaimRewardModalProps) {
  const [step, setStep] = useState<"choose" | "external" | "loading" | "success" | "error">("choose");
  const [externalAddress, setExternalAddress] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const handleClaim = async (walletType: "inapp" | "external") => {
    setStep("loading");
    try {
      const res = await fetch("/api/reward/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          walletType,
          externalAddress: walletType === "external" ? externalAddress : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Transfer failed. Please try again.");
        setStep("error");
        return;
      }
      setTxSignature(data.tx);
      setStep("success");
      onSuccess(data.tx);
    } catch (err: any) {
      setErrorMsg(err.message || "Unknown error");
      setStep("error");
    }
  };

  const copyTx = () => {
    navigator.clipboard.writeText(txSignature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-brand-surface border border-brand-border rounded-[2px] w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-border">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-brand-lime mb-1">
              {ordinal(position)} Place Prize
            </div>
            <div className="font-display text-2xl font-bold">
              {amount.toFixed(2)} <span className="text-brand-lime">{token}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Guest Warning */}
          {isGuest && step === "choose" && (
            <div className="mb-5 p-4 bg-yellow-950/40 border border-yellow-700 rounded-[2px] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <strong className="block mb-1">You&apos;re playing as a guest</strong>
                Your claim is tied to this browser session only. If you leave without claiming,
                you may lose access to this reward. Claim immediately or{" "}
                <a href="/login" className="underline text-yellow-400 hover:text-yellow-200">create an account</a>.
              </div>
            </div>
          )}

          {/* Choose step */}
          {step === "choose" && (
            <div className="space-y-3">
              {!isGuest && hasInAppWallet && (
                <button
                  onClick={() => handleClaim("inapp")}
                  className="w-full flex items-center gap-4 p-5 border border-brand-border hover:border-brand-lime bg-brand-black rounded-[2px] transition-all group"
                >
                  <div className="w-10 h-10 bg-brand-surface border border-brand-border rounded-[2px] flex items-center justify-center group-hover:border-brand-lime transition-colors">
                    <Wallet className="w-5 h-5 text-brand-lime" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-brand-white">Claim to In-App Wallet</div>
                    <div className="text-xs text-brand-muted font-mono mt-0.5">
                      Your Ramblee custodial wallet
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => setStep("external")}
                className="w-full flex items-center gap-4 p-5 border border-brand-border hover:border-brand-white bg-brand-black rounded-[2px] transition-all group"
              >
                <div className="w-10 h-10 bg-brand-surface border border-brand-border rounded-[2px] flex items-center justify-center group-hover:border-brand-white transition-colors">
                  <ExternalLink className="w-5 h-5 text-brand-muted group-hover:text-brand-white transition-colors" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-brand-white">Claim to External Wallet</div>
                  <div className="text-xs text-brand-muted font-mono mt-0.5">
                    Phantom, Solflare, or any Solana wallet
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* External address step */}
          {step === "external" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-brand-muted font-mono uppercase tracking-wider mb-2">
                  Your Solana Wallet Address
                </label>
                <input
                  type="text"
                  value={externalAddress}
                  onChange={(e) => setExternalAddress(e.target.value)}
                  placeholder="Paste your Solana address..."
                  className="w-full bg-brand-black border border-brand-border rounded-[2px] py-3 px-4 text-brand-white font-mono text-sm focus:outline-none focus:border-brand-lime transition-colors"
                />
                <p className="text-xs text-brand-muted mt-2 font-mono">
                  ⚠ Double-check your address. Token transfers cannot be reversed.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("choose")}
                  className="flex-1 py-3 border border-brand-border text-brand-muted rounded-[2px] hover:text-brand-white transition-colors font-mono text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => handleClaim("external")}
                  disabled={externalAddress.length < 32}
                  className="flex-1 py-3 bg-brand-lime text-brand-black font-bold rounded-[2px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Claim
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Loader2 className="w-10 h-10 text-brand-lime animate-spin" />
              <p className="text-brand-white font-semibold">Processing transfer...</p>
              <p className="text-brand-muted text-sm font-mono">This takes a few seconds on Solana.</p>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-brand-lime" />
              <p className="font-display text-2xl font-bold">Reward Claimed! 🎉</p>
              <p className="text-brand-muted text-sm">
                {amount.toFixed(2)} {token} has been sent to your wallet.
              </p>
              <button
                onClick={copyTx}
                className="flex items-center gap-2 text-xs font-mono text-brand-muted hover:text-brand-lime transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-brand-lime" /> : <Copy className="w-4 h-4" />}
                {txSignature.slice(0, 20)}...{txSignature.slice(-8)}
              </button>
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-lime hover:underline font-mono"
              >
                View on Solana Explorer ↗
              </a>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-brand-lime text-brand-black font-bold rounded-[2px] hover:brightness-110 transition-all"
              >
                Done
              </button>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-12 h-12 rounded-full border border-status-wrong/50 bg-status-wrong/10 flex items-center justify-center">
                <X className="w-6 h-6 text-status-wrong" />
              </div>
              <p className="font-semibold text-status-wrong">Transfer Failed</p>
              <p className="text-brand-muted text-sm font-mono max-w-xs">{errorMsg}</p>
              <button
                onClick={() => setStep("choose")}
                className="px-6 py-2 border border-brand-border text-brand-white rounded-[2px] hover:bg-brand-surface transition-colors font-mono text-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
