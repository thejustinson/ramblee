"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getTokenBalance, USDC_MINT, USDG_MINT } from "@/utils/solana";
import { CheckCircle2, Copy, Loader2, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/BackButton";

interface FundingClientProps {
  gameId: string;
  gameTitle: string;
  escrowWallet: string;
  rewardAmount: number;
  rewardToken: string;
  rewardDistribution: { position: number; percentage: number }[] | null;
}

const POLL_INTERVAL_MS = 6000; // poll every 6 seconds

export default function FundingClient({
  gameId,
  gameTitle,
  escrowWallet,
  rewardAmount,
  rewardToken,
  rewardDistribution,
}: FundingClientProps) {
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [funded, setFunded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const router = useRouter();

  const mintAddress = rewardToken === "USDG" ? USDG_MINT : USDC_MINT;

  const checkBalance = useCallback(async () => {
    const balance = await getTokenBalance(escrowWallet, mintAddress);
    setCurrentBalance(balance);
    if (balance >= rewardAmount) {
      setFunded(true);
    }
  }, [escrowWallet, mintAddress, rewardAmount]);

  // Activate game once funded
  const activateGame = async () => {
    setIsActivating(true);
    const supabase = createClient();
    await supabase
      .from("games")
      .update({ status: "draft" })
      .eq("id", gameId);
    router.push(`/dashboard/game/${gameId}`);
  };

  useEffect(() => {
    checkBalance(); // initial check
    const interval = setInterval(checkBalance, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkBalance]);

  const handleCopy = () => {
    navigator.clipboard.writeText(escrowWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = currentBalance !== null
    ? Math.min((currentBalance / rewardAmount) * 100, 100)
    : 0;

  const ordinal = (n: number) =>
    n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

  return (
    <div className="min-h-screen bg-brand-black text-brand-white flex flex-col p-6 md:p-12">
      <div className="max-w-2xl w-full mx-auto">
        <div className="mb-10">
          <BackButton />
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-brand-lime border border-brand-lime/30 bg-brand-lime/5 px-3 py-1 rounded-[2px] mb-4">
            <Lock className="w-3 h-3" /> Awaiting Escrow Deposit
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">{gameTitle}</h1>
          <p className="text-brand-muted text-sm">
            Deposit <span className="text-brand-white font-semibold">{rewardAmount} {rewardToken}</span> into the game escrow wallet to unlock your room.
            This guarantees the prize pool for your players.
          </p>
        </div>

        {/* Main Deposit Card */}
        <div className={`border rounded-[2px] p-8 mb-6 transition-colors ${funded ? "border-brand-lime bg-brand-lime/5" : "border-brand-border bg-brand-surface"}`}>
          {funded ? (
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-brand-lime" />
              <h2 className="font-display text-3xl font-bold">Funds Received!</h2>
              <p className="text-brand-muted">Your escrow has been funded. The game is ready to go live.</p>
              <button
                onClick={activateGame}
                disabled={isActivating}
                className="mt-4 flex items-center gap-2 px-8 py-4 bg-brand-lime text-brand-black font-bold rounded-[2px] hover:brightness-110 transition-all disabled:opacity-60"
              >
                {isActivating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Activating...</>
                ) : (
                  <>Open Control Room <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Amount to send */}
              <div className="flex items-start justify-between gap-4 p-4 bg-brand-black border border-brand-border rounded-[2px]">
                <div>
                  <p className="text-xs text-brand-muted font-mono uppercase tracking-wider mb-1">Amount to Send</p>
                  <p className="font-display text-3xl font-bold text-brand-lime">{rewardAmount} <span className="text-xl">{rewardToken}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-muted font-mono uppercase tracking-wider mb-1">Network</p>
                  <p className="font-mono text-sm text-brand-white">Solana Devnet</p>
                </div>
              </div>

              {/* Wallet address */}
              <div>
                <p className="text-xs text-brand-muted font-mono uppercase tracking-wider mb-2">Escrow Wallet Address</p>
                <div className="flex items-center gap-2 p-4 bg-brand-black border border-brand-border rounded-[2px] group">
                  <p className="font-mono text-sm text-brand-white break-all flex-1 select-all">{escrowWallet}</p>
                  <button
                    onClick={handleCopy}
                    title="Copy address"
                    className="shrink-0 text-brand-muted hover:text-brand-lime transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-brand-lime" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-brand-muted mt-2 font-mono">
                  ⚠ Only send {rewardToken} on Solana Devnet to this address.
                </p>
              </div>

              {/* Balance progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-brand-muted font-mono uppercase tracking-wider">Balance Detected</p>
                  <span className="font-mono text-sm text-brand-white">
                    {currentBalance !== null ? `${currentBalance.toFixed(2)} / ${rewardAmount} ${rewardToken}` : "Checking..."}
                  </span>
                </div>
                <div className="w-full h-2 bg-brand-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-lime transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-brand-muted font-mono">
                <Loader2 className="w-3 h-3 animate-spin" />
                Polling balance every {POLL_INTERVAL_MS / 1000}s...
              </div>
            </div>
          )}
        </div>

        {/* Prize Split Preview */}
        {rewardDistribution && rewardDistribution.length > 0 && (
          <div className="border border-brand-border rounded-[2px] p-6">
            <h2 className="text-xs text-brand-muted font-mono uppercase tracking-widest mb-4">Prize Distribution</h2>
            <div className="space-y-2">
              {rewardDistribution.map((split) => {
                const payout = ((split.percentage / 100) * rewardAmount).toFixed(2);
                return (
                  <div key={split.position} className="flex items-center justify-between py-2 border-b border-brand-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-black border border-brand-border rounded-[2px] flex items-center justify-center font-mono text-xs">
                        {ordinal(split.position)}
                      </div>
                      <span className="text-sm text-brand-muted">{split.percentage}% of pool</span>
                    </div>
                    <span className="font-display font-bold text-lg text-brand-white">
                      {payout} <span className="text-brand-muted text-xs font-mono">{rewardToken}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
