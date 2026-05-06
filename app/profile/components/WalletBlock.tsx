"use client";

import { useState } from "react";
import { Wallet, Copy, Check, ArrowUpRight, AlertCircle, Loader2 } from "lucide-react";

interface WalletBlockProps {
  walletAddress: string | null;
  usdcBalance: number;
  usdgBalance: number;
}

export default function WalletBlock({ walletAddress, usdcBalance, usdgBalance }: WalletBlockProps) {
  const [copied, setCopied] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState<{isOpen: boolean, token: 'USDC'|'USDG' | null}>({ isOpen: false, token: null });
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const copyToClipboard = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdrawStart = (token: 'USDC' | 'USDG') => {
    setWithdrawModal({ isOpen: true, token });
    setRecipient("");
    setAmount("");
    setError(null);
    setSuccess(null);
    setIsConfirming(false);
  };

  const handleWithdrawReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const numAmount = parseFloat(amount);
    const maxBalance = withdrawModal.token === 'USDC' ? usdcBalance : usdgBalance;
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (numAmount > maxBalance) {
      setError(`Amount exceeds your available ${withdrawModal.token} balance.`);
      return;
    }
    if (!recipient.trim() || recipient.length < 32) {
      setError("Please enter a valid Solana wallet address.");
      return;
    }
    
    setIsConfirming(true);
  };

  const handleWithdrawConfirm = async () => {
    setIsWithdrawing(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: withdrawModal.token,
          amount: parseFloat(amount),
          recipient
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      
      setSuccess(`Successfully withdrew ${amount} ${withdrawModal.token}! Tx: ${data.signature.substring(0, 10)}...`);
      setIsConfirming(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during withdrawal.");
      setIsConfirming(false);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!walletAddress) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-[2px] p-8 flex flex-col items-center justify-center text-center">
        <Wallet className="w-12 h-12 text-brand-muted mb-4" />
        <h3 className="font-display font-bold text-xl mb-2">Wallet Provisioning...</h3>
        <p className="text-brand-muted text-sm max-w-sm">Your secure custodial Solana wallet is being created. It will appear here shortly.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-6 h-6 text-brand-lime" />
        <h2 className="font-display text-2xl font-bold">Custodial Wallet</h2>
      </div>

      <div className="bg-brand-black border border-brand-border rounded-[2px] p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-brand-muted mb-1">Solana Address</p>
          <p className="font-mono text-sm break-all">{walletAddress}</p>
        </div>
        <button 
          onClick={copyToClipboard}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-brand-surface hover:bg-brand-border transition-colors rounded-[2px] text-sm font-medium border border-brand-border"
        >
          {copied ? <Check className="w-4 h-4 text-brand-lime" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* USDC Balance */}
        <div className="bg-brand-black border border-brand-border rounded-[2px] p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted mb-1">Balance</p>
              <h3 className="font-display text-4xl font-bold text-brand-white">{usdcBalance.toLocaleString()} <span className="text-base text-brand-muted">USDC</span></h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#2775CA]/10 flex items-center justify-center border border-[#2775CA]/30">
              <span className="font-bold text-[#2775CA]">$</span>
            </div>
          </div>
          <button 
            onClick={() => handleWithdrawStart('USDC')}
            disabled={usdcBalance <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-surface border border-brand-border hover:border-brand-lime transition-colors rounded-[2px] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4" /> Withdraw
          </button>
        </div>

        {/* USDG Balance */}
        <div className="bg-brand-black border border-brand-border rounded-[2px] p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted mb-1">Balance</p>
              <h3 className="font-display text-4xl font-bold text-brand-white">{usdgBalance.toLocaleString()} <span className="text-base text-brand-muted">USDG</span></h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-lime/10 flex items-center justify-center border border-brand-lime/30">
              <span className="font-bold text-brand-lime">G</span>
            </div>
          </div>
          <button 
            onClick={() => handleWithdrawStart('USDG')}
            disabled={usdgBalance <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-surface border border-brand-border hover:border-brand-lime transition-colors rounded-[2px] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4" /> Withdraw
          </button>
        </div>
      </div>

      {/* Withdraw Modal */}
      {withdrawModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-brand-surface border border-brand-border rounded-[2px] max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-black">
              <h3 className="font-display font-bold text-xl">Withdraw {withdrawModal.token}</h3>
              <button onClick={() => setWithdrawModal({isOpen: false, token: null})} className="text-brand-muted hover:text-brand-white">✕</button>
            </div>
            
            <div className="p-6">
              {success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-brand-lime/20 flex items-center justify-center mx-auto mb-4 border border-brand-lime">
                    <Check className="w-8 h-8 text-brand-lime" />
                  </div>
                  <h4 className="font-display font-bold text-2xl mb-2">Success!</h4>
                  <p className="text-brand-muted text-sm mb-6">{success}</p>
                  <button 
                    onClick={() => { setWithdrawModal({isOpen: false, token: null}); window.location.reload(); }}
                    className="w-full py-3 bg-brand-lime text-brand-black font-bold uppercase rounded-[2px]"
                  >
                    Done
                  </button>
                </div>
              ) : isConfirming ? (
                <div className="space-y-6">
                  <div className="p-4 border border-brand-border bg-brand-black rounded-[2px] space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted uppercase tracking-widest text-[10px]">Amount</span>
                      <span className="font-bold">{amount} {withdrawModal.token}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted uppercase tracking-widest text-[10px]">To</span>
                      <span className="font-mono text-xs">{recipient.substring(0, 8)}...{recipient.substring(recipient.length - 8)}</span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-brand-border flex justify-between text-sm">
                      <span className="text-brand-muted uppercase tracking-widest text-[10px]">Network Fee</span>
                      <span>Paid by Ramblee</span>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="p-3 bg-status-wrong/10 border border-status-wrong text-status-wrong text-sm rounded-[2px] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsConfirming(false)} 
                      disabled={isWithdrawing}
                      className="flex-1 py-3 bg-transparent border border-brand-border hover:bg-brand-border transition-colors rounded-[2px] font-medium disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleWithdrawConfirm}
                      disabled={isWithdrawing}
                      className="flex-1 py-3 bg-brand-lime text-brand-black hover:brightness-110 transition-colors rounded-[2px] font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isWithdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign & Send"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleWithdrawReview} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-medium text-brand-muted mb-1 uppercase tracking-widest">Recipient Solana Address</label>
                    <input 
                      type="text" 
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Paste Solana address..."
                      required
                      className="w-full bg-brand-black border border-brand-border rounded-[2px] py-3 px-4 text-brand-white focus:outline-none focus:border-brand-lime font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-[10px] font-medium text-brand-muted uppercase tracking-widest">Amount</label>
                      <span className="text-[10px] text-brand-muted uppercase tracking-widest">Max: {withdrawModal.token === 'USDC' ? usdcBalance : usdgBalance}</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.000001"
                        min="0"
                        required
                        className="w-full bg-brand-black border border-brand-border rounded-[2px] py-3 px-4 pr-16 text-brand-white focus:outline-none focus:border-brand-lime font-mono text-lg"
                      />
                      <button 
                        type="button"
                        onClick={() => setAmount(String(withdrawModal.token === 'USDC' ? usdcBalance : usdgBalance))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-brand-surface border border-brand-border px-2 py-1 rounded-[2px] uppercase font-bold text-brand-lime hover:bg-brand-border"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-status-wrong/10 border border-status-wrong text-status-wrong text-sm rounded-[2px] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-white text-brand-black hover:bg-brand-lime transition-colors rounded-[2px] font-bold uppercase mt-2"
                  >
                    Review Withdrawal
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
