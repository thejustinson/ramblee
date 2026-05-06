"use client";

import { useState } from "react";
import { Gift, CheckCircle2 } from "lucide-react";
import ClaimRewardModal from "@/app/components/ClaimRewardModal";

interface Claim {
  id: string;
  game_id: string;
  position: number;
  amount: number;
  token: string;
  status: string;
  games: { title: string };
}

export default function UnclaimedRewardsBanner({
  claims,
  hasInAppWallet,
}: {
  claims: Claim[];
  hasInAppWallet: boolean;
}) {
  const [openClaim, setOpenClaim] = useState<Claim | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const visible = claims.filter(c => !claimedIds.has(c.id));
  if (visible.length === 0) return null;

  const ordinal = (n: number) =>
    n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

  return (
    <>
      <div className="mb-8 border border-yellow-700 bg-yellow-950/30 rounded-[2px] p-5">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-5 h-5 text-yellow-400" />
          <h2 className="font-display font-bold text-lg text-yellow-300">Unclaimed Rewards</h2>
          <span className="ml-auto text-xs font-mono text-yellow-500 border border-yellow-700 px-2 py-0.5 rounded-[2px]">
            {visible.length} pending
          </span>
        </div>
        <div className="space-y-3">
          {visible.map((claim) => (
            <div key={claim.id} className="flex items-center justify-between gap-4 bg-brand-black/40 border border-brand-border rounded-[2px] px-4 py-3">
              <div>
                <p className="text-sm text-brand-white font-semibold">{(claim.games as any)?.title ?? "Game"}</p>
                <p className="text-xs text-brand-muted font-mono mt-0.5">
                  {ordinal(claim.position)} Place — {claim.amount.toFixed(2)} {claim.token}
                </p>
              </div>
              <button
                onClick={() => setOpenClaim(claim)}
                className="shrink-0 px-4 py-2 bg-brand-lime text-brand-black text-sm font-bold rounded-[2px] hover:brightness-110 transition-all"
              >
                Claim
              </button>
            </div>
          ))}
        </div>
      </div>

      {openClaim && (
        <ClaimRewardModal
          claimId={openClaim.id}
          amount={openClaim.amount}
          token={openClaim.token}
          position={openClaim.position}
          isGuest={false}
          hasInAppWallet={hasInAppWallet}
          onClose={() => setOpenClaim(null)}
          onSuccess={() => {
            setClaimedIds(prev => new Set([...prev, openClaim.id]));
            setOpenClaim(null);
          }}
        />
      )}
    </>
  );
}
