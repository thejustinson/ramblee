"use client";

import { useState } from "react";
import { Wallet, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface WalletBlockProps {
  walletAddress: string | null;
}

export default function WalletBlock({ walletAddress }: WalletBlockProps) {
  const [addressInput, setAddressInput] = useState(walletAddress ?? "");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateWallet = async (newAddress: string | null) => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: newAddress, action: newAddress ? 'update' : 'remove' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save wallet address');
      setSuccess(newAddress ? 'Wallet updated successfully.' : 'Wallet address removed.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Could not update wallet address.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await updateWallet(addressInput.trim() || null);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    await updateWallet(null);
    setIsRemoving(false);
  };

  return (
    <div id="wallet-section" className="bg-brand-surface border border-brand-border rounded-[2px] p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-brand-lime" />
        <div>
          <h2 className="font-display text-2xl font-bold">Solana Wallet</h2>
          <p className="text-sm text-brand-muted">Your external wallet is required to claim reward payouts.</p>
        </div>
      </div>

      <div className="bg-brand-black border border-brand-border rounded-[2px] p-5">
        <h3 className="font-semibold text-sm text-brand-white mb-3">Wallet Address</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3">
            <input
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter your Solana wallet address"
              className="w-full bg-brand-surface border border-brand-border rounded-[2px] px-4 py-3 text-brand-white font-mono text-sm focus:outline-none focus:border-brand-lime"
            />
            {walletAddress && (
              <div className="flex flex-wrap gap-2 items-center text-xs text-brand-muted">
                <span className="font-mono">Current address:</span>
                <span className="font-mono text-brand-white break-all">{walletAddress}</span>
                <button type="button" onClick={handleCopy} className="text-brand-lime hover:text-brand-white transition-colors">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-[2px] border border-status-wrong p-3 text-status-wrong text-sm">{error}</div>
          )}
          {success && (
            <div className="rounded-[2px] border border-brand-lime p-3 text-brand-lime text-sm">{success}</div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-brand-lime text-brand-black rounded-[2px] font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Wallet'}
            </button>
            {walletAddress && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isRemoving}
                className="flex-1 py-3 bg-transparent border border-brand-border text-brand-muted rounded-[2px] hover:border-status-wrong hover:text-status-wrong transition-all disabled:opacity-50"
              >
                {isRemoving ? 'Removing...' : 'Remove Wallet'}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-brand-black border border-brand-border rounded-[2px] p-5 text-sm space-y-3">
        <p className="font-semibold text-brand-white">Need a Solana wallet?</p>
        <p className="text-brand-muted">Use any Solana wallet such as Phantom, Backpack, or Solflare. Your wallet is only used for reward payouts - you will not interact with Privy directly.</p>
        <ul className="list-disc list-inside text-brand-muted space-y-1">
          <li>Install a wallet extension or mobile app.</li>
          <li>Copy your public Solana address.</li>
          <li>Paste it above and save it to claim prizes.</li>
        </ul>
        <a href="https://phantom.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-lime hover:underline">
          <ExternalLink className="w-4 h-4" /> Learn more about Solana wallets
        </a>
      </div>
    </div>
  );
}