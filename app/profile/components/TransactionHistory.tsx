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

const TYPE_CONFIG = {
  claim:      { icon: ArrowDownLeft, color: "text-brand-lime",  bg: "bg-brand-lime/10",  label: "Claim"      },
  withdrawal: { icon: ArrowUpRight,  color: "text-blue-400",   bg: "bg-blue-400/10",    label: "Withdrawal" },
  deposit:    { icon: Wallet,        color: "text-yellow-400", bg: "bg-yellow-400/10",  label: "Deposit"    },
};

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
    <div className="bg-brand-surface border border-brand-border rounded-[2px] p-10 text-center">
      <Clock className="w-10 h-10 text-brand-muted mx-auto mb-3" />
      <h3 className="font-display font-bold text-lg mb-1">No transaction history</h3>
      <p className="text-brand-muted text-sm">Your claims and withdrawals will appear here.</p>
    </div>
  );

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[2px] overflow-hidden">
      <div className="p-4 md:p-6 border-b border-brand-border bg-brand-black/20">
        <h2 className="font-display text-lg md:text-xl font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-brand-lime" /> Transaction History
        </h2>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-black/40 text-[10px] uppercase tracking-widest text-brand-muted border-b border-brand-border">
              <th className="px-6 py-4 font-semibold">Date &amp; Time</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Tx ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/50">
            {transactions.map((tx) => {
              const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.deposit;
              return (
                <tr key={tx.id} className="hover:bg-brand-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-brand-white">{new Date(tx.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px] text-brand-muted font-mono uppercase">
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className="text-sm font-medium">{cfg.label}</span>
                    </div>
                    {tx.games && (
                      <div className="text-[10px] text-brand-muted truncate max-w-[140px]">{tx.games.title}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold">{tx.amount.toFixed(2)}</span>
                    <span className="text-xs text-brand-muted font-mono ml-1">{tx.token}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
                      Confirmed
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tx.tx_id ? (
                      <a href={`https://explorer.solana.com/tx/${tx.tx_id}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-lime font-mono transition-colors">
                        <Hash className="w-3 h-3" />
                        {tx.tx_id.substring(0, 6)}…{tx.tx_id.slice(-4)}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <span className="text-xs text-brand-muted italic font-mono">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-brand-border/50">
        {transactions.map((tx) => {
          const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.deposit;
          return (
            <div key={tx.id} className="flex items-start gap-3 p-4">
              {/* Icon circle */}
              <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${cfg.bg}`}>
                <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{cfg.label}</span>
                  <span className="font-bold text-sm text-brand-white">
                    {tx.amount.toFixed(2)} <span className="text-brand-muted font-mono text-xs">{tx.token}</span>
                  </span>
                </div>
                {tx.games && (
                  <div className="text-[11px] text-brand-muted truncate">{tx.games.title}</div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-brand-muted/60">
                    {new Date(tx.created_at).toLocaleDateString()} · {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {tx.tx_id ? (
                    <a href={`https://explorer.solana.com/tx/${tx.tx_id}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-[10px] text-brand-muted hover:text-brand-lime font-mono transition-colors">
                      <Hash className="w-2.5 h-2.5" />
                      {tx.tx_id.substring(0, 6)}…{tx.tx_id.slice(-4)}
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
