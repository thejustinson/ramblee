"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import ClaimRewardModal from "@/app/components/ClaimRewardModal";

interface Claim {
  id: string;
  position: number;
  amount: number;
  token: string;
  status: string;
  user_id: string | null;
}

interface Props {
  claim: Claim;
  isCurrentUser: boolean;
  isGuest: boolean;
  currentUserId: string | null;
  hasInAppWallet: boolean;
}

export default function ResultsClaim({ claim, isCurrentUser, isGuest, currentUserId, hasInAppWallet }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [claimed, setClaimed] = useState(claim.status === "claimed");

  // Only the winner (or a guest who is viewing this) should see claim UI
  // For logged-in users: isCurrentUser must be true
  // For guests: there's no user, so we show the claim button for the position (less secure, but guest play is inherently anonymous)
  const canClaim = isCurrentUser || isGuest;

  if (!canClaim) return null;

  if (claimed) {
    return (
      <div className="flex items-center gap-2 text-brand-lime text-sm font-mono">
        <CheckCircle2 className="w-4 h-4" />
        Claimed
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-brand-lime text-brand-black text-sm font-bold rounded-[2px] hover:brightness-110 transition-all"
      >
        🎉 Claim Reward
      </button>
      {showModal && (
        <ClaimRewardModal
          claimId={claim.id}
          amount={claim.amount}
          token={claim.token}
          position={claim.position}
          isGuest={isGuest}
          hasInAppWallet={hasInAppWallet}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setClaimed(true); setShowModal(false); }}
        />
      )}
    </>
  );
}
