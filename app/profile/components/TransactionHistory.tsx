"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Clock, ArrowUpRight, ArrowDownLeft, Wallet, ExternalLink, Hash } from "lucide-react";

interface Transaction {
  id: string;
  type: 'deposit' | 'claim' | 'withdrawal';
  amount: number;
  token: string;
  tx_id: string;
  source_wallet: string;
  dest_wallet: string;
  created_at: string;
  games?: { title: string };
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("transaction_history")
        .select("*, games(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setTransactions(data as any);
      setLoading(false);
    }
    fetchHistory();
  }, []);

  if (loading) return (
    <div className="py-12 flex justify-center">
      <div className="w-8 h-8 border-2 border-brand-lime border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (transactions.length === 0) return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-12 text-center">
      <Clock className="w-12 h-12 text-brand-muted mx-auto mb-4" />
      <h3 className="font-display font-bold text-xl mb-2">No transaction history</h3>
      <p className="text-brand-muted text-sm">Your claims and withdrawals will appear here.</p>
    </div>
  );

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] overflow-hidden">
      <div className="p-6 border-b border-brand-border bg-brand-black/20">
        <h2 className="font-display text-xl font-bold flex items-center gap-3">
          <Clock className="w-5 h-5 text-brand-lime" /> Transaction History
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-black/40 text-[10px] uppercase tracking-widest text-brand-muted border-b border-brand-border">
              <th className="px-6 py-4 font-semibold">Date & Time</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Transaction ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-brand-white/[0.02] transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-brand-white">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-brand-muted font-mono uppercase">
                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {tx.type === 'claim' ? (
                      <ArrowDownLeft className="w-4 h-4 text-brand-lime" />
                    ) : tx.type === 'withdrawal' ? (
                      <ArrowUpRight className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Wallet className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-sm font-medium capitalize">{tx.type}</span>
                  </div>
                  {tx.games && (
                    <div className="text-[10px] text-brand-muted truncate max-w-[120px]" title={tx.games.title}>
                      {tx.games.title}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-brand-white">
                    {tx.amount.toFixed(2)} <span className="text-xs text-brand-muted font-mono">{tx.token}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
                    Confirmed
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {tx.tx_id ? (
                    <a 
                      href={`https://explorer.solana.com/tx/${tx.tx_id}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-lime font-mono transition-colors"
                    >
                      <Hash className="w-3 h-3" />
                      {tx.tx_id.substring(0, 6)}...{tx.tx_id.substring(tx.tx_id.length - 4)}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <span className="text-xs text-brand-muted italic font-mono">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
