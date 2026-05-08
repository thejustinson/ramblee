import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  Users,
  Gamepad2,
  Trophy,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Wallet,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[2px] border p-6 flex flex-col gap-3 ${
        accent
          ? "bg-brand-lime/5 border-brand-lime/30"
          : "bg-white/[0.03] border-white/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
          {label}
        </span>
        <Icon
          className={`w-4 h-4 ${accent ? "text-brand-lime" : "text-white/30"}`}
        />
      </div>
      <div
        className={`font-display text-4xl font-bold ${
          accent ? "text-brand-lime" : "text-white"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs font-mono text-white/30 -mt-1">{sub}</div>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AdminPage() {
  // Use regular client only to verify the admin user identity (respects RLS / auth)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;

  // Use service-role client for all data queries — bypasses RLS so we see ALL records
  const adminDb = createAdminClient();

  // ── Aggregate stats in parallel ─────────────────────────────────────────────
  const [
    { count: totalUsers },
    { count: totalGames },
    { count: activeGames },
    { count: finishedGames },
    { count: totalParticipants },
    { data: claimsData },       // reward_claims — used for pending/status view
    { data: txHistoryData },    // transaction_history — authoritative for actual on-chain transfers
    { data: recentGames },
    { data: recentUsers },
    { data: topOrganisers },
    { data: finishedWithPrizes },
  ] = await Promise.all([
    adminDb.from("profiles").select("id", { count: "exact", head: true }),
    adminDb.from("games").select("id", { count: "exact", head: true }),
    adminDb.from("games").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminDb.from("games").select("id", { count: "exact", head: true }).eq("status", "finished"),
    adminDb.from("participants").select("id", { count: "exact", head: true }),
    // reward_claims for pending/unclaimed view
    adminDb.from("reward_claims").select("id, amount, token, status, claimed_at, games(title)"),
    // transaction_history = authoritative log of actual on-chain transfers
    adminDb.from("transaction_history").select("id, user_id, type, amount, token, tx_id, created_at, profiles(handle, display_name), games(title)").order("created_at", { ascending: false }),
    adminDb.from("games").select("id, title, mode, status, created_at, reward_amount, reward_token").order("created_at", { ascending: false }).limit(10),
    adminDb.from("profiles").select("id, handle, display_name, created_at").order("created_at", { ascending: false }).limit(10),
    adminDb.from("games").select("organiser_id, profiles!games_organiser_id_fkey(handle, display_name)").order("created_at", { ascending: false }),
    adminDb.from("games").select("reward_amount, reward_token").eq("status", "finished").not("reward_amount", "is", null).gt("reward_amount", 0),
  ]);

  // ── Derived numbers ──────────────────────────────────────────────────────────
  const claims = claimsData ?? [];
  const txHistory = txHistoryData ?? [];

  // Prize pools committed by organisers (finished games)
  const prizePoolByToken: Record<string, number> = {};
  for (const g of finishedWithPrizes ?? []) {
    if (g.reward_token && g.reward_amount) {
      prizePoolByToken[g.reward_token] = (prizePoolByToken[g.reward_token] || 0) + Number(g.reward_amount);
    }
  }

  // ✅ Claimed on-chain: read from transaction_history (authoritative)
  const claimedByToken: Record<string, number> = {};
  let totalClaimedCount = 0;
  for (const tx of txHistory.filter(t => t.type === "claim")) {
    claimedByToken[tx.token] = (claimedByToken[tx.token] || 0) + Number(tx.amount);
    totalClaimedCount++;
  }

  // Pending: from reward_claims where status = unclaimed
  const pendingByToken: Record<string, number> = {};
  let totalUnclaimedCount = 0;
  for (const c of claims) {
    if (c.status === "unclaimed") {
      pendingByToken[c.token] = (pendingByToken[c.token] || 0) + Number(c.amount);
      totalUnclaimedCount++;
    }
  }

  // Biggest winners — aggregate claim amounts per user from transaction_history
  const winnerMap: Record<string, { handle: string; display_name: string; totalByToken: Record<string, number> }> = {};
  for (const tx of txHistory.filter(t => t.type === "claim" && t.user_id)) {
    const profile = tx.profiles as any;
    if (!profile) continue;
    const uid = tx.user_id!;
    if (!winnerMap[uid]) {
      winnerMap[uid] = { handle: profile.handle, display_name: profile.display_name, totalByToken: {} };
    }
    winnerMap[uid].totalByToken[tx.token] = (winnerMap[uid].totalByToken[tx.token] || 0) + Number(tx.amount);
  }
  const biggestWinners = Object.values(winnerMap)
    .map(w => ({
      ...w,
      totalUsd: Object.values(w.totalByToken).reduce((s, v) => s + v, 0),
      summary: `$${Object.values(w.totalByToken).reduce((s, v) => s + v, 0).toFixed(2)}`,
    }))
    .sort((a, b) => b.totalUsd - a.totalUsd)
    .slice(0, 10);

  // Sum all tokens into a single USD figure (USDC and USDG are both 1:1 with USD)
  const sumTokenMap = (map: Record<string, number>) =>
    Object.values(map).reduce((s, v) => s + v, 0);

  const totalPoolStr  = `$${sumTokenMap(prizePoolByToken).toFixed(2)}`;
  const totalClaimedStr = `$${sumTokenMap(claimedByToken).toFixed(2)}`;
  const totalPendingStr = `$${sumTokenMap(pendingByToken).toFixed(2)}`;

  // Count games per organiser
  const organiserCounts: Record<string, { handle: string; display_name: string; count: number }> = {};
  for (const g of topOrganisers ?? []) {
    const id = g.organiser_id;
    const profile = g.profiles as any;
    if (!organiserCounts[id]) {
      organiserCounts[id] = {
        handle: profile?.handle ?? "—",
        display_name: profile?.display_name ?? "Unknown",
        count: 0,
      };
    }
    organiserCounts[id].count++;
  }
  const topOrganisersList = Object.values(organiserCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const statusColor: Record<string, string> = {
    finished: "text-white/40 border-white/10",
    active: "text-brand-lime border-brand-lime/30",
    draft: "text-yellow-400 border-yellow-400/30",
    funding: "text-blue-400 border-blue-400/30",
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Page title */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">
          Platform Overview
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">
          Admin Dashboard
        </h1>
      </div>

      {/* ── Top-level stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={(totalUsers ?? 0).toLocaleString()} />
        <StatCard
          icon={Gamepad2}
          label="Total Games"
          value={(totalGames ?? 0).toLocaleString()}
          sub={`${finishedGames ?? 0} finished · ${activeGames ?? 0} live`}
        />
        <StatCard icon={Users} label="Total Participants" value={(totalParticipants ?? 0).toLocaleString()} />
        <StatCard icon={DollarSign} label="Prize Pools Committed" value={totalPoolStr} sub="from finished games" accent />
      </div>

      {/* ── Payout breakdown ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={CheckCircle2}
          label="Claimed On-Chain"
          value={totalClaimedStr}
          sub={`${totalClaimedCount} successful transfer${totalClaimedCount !== 1 ? 's' : ''}`}
          accent
        />
        <StatCard
          icon={Clock}
          label="Pending Claims"
          value={totalPendingStr}
          sub={`${totalUnclaimedCount} winner${totalUnclaimedCount !== 1 ? 's' : ''} haven't claimed yet`}
        />
        <StatCard
          icon={Activity}
          label="Total Claim Records"
          value={claims.length}
        />
      </div>

      {/* ── Prize Pool vs. Claimed (unified $ view) ───────────────────────── */}
      {(sumTokenMap(prizePoolByToken) > 0 || sumTokenMap(claimedByToken) > 0) && (() => {
        const totalPool = sumTokenMap(prizePoolByToken);
        const totalClaimed = sumTokenMap(claimedByToken);
        const totalPending = sumTokenMap(pendingByToken);
        const pct = totalPool > 0 ? Math.min((totalClaimed / totalPool) * 100, 100) : 0;
        return (
          <div>
            <SectionHeader title="Prize Pool Breakdown" />
            <div className="bg-white/[0.03] border border-white/10 rounded-[2px] p-8 flex flex-col gap-5">
              {/* Numbers row */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">Total Pool</div>
                  <div className="font-display text-3xl font-bold text-white">${totalPool.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">Claimed</div>
                  <div className="font-display text-3xl font-bold text-brand-lime">${totalClaimed.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">Pending</div>
                  <div className="font-display text-3xl font-bold text-yellow-400">${totalPending.toFixed(2)}</div>
                </div>
              </div>
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] font-mono text-white/30 mb-2">
                  <span>Claimed {pct.toFixed(1)}%</span>
                  <span>Unclaimed {(100 - pct).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-lime rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ── Recent Games ────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Recent Games" />
        <div className="bg-white/[0.02] border border-white/10 rounded-[2px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/30">
                  <th className="px-6 py-4">Game</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Prize</th>
                  <th className="px-6 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {(recentGames ?? []).map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/game/${g.id}`}
                        className="font-semibold text-white group-hover:text-brand-lime transition-colors"
                      >
                        {g.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-white/40 uppercase">
                      {g.mode}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-widest border px-2 py-0.5 rounded-full ${
                          statusColor[g.status] ?? "text-white/40 border-white/10"
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">
                      {g.reward_amount ? (
                        <span className="text-brand-lime font-bold">
                          {g.reward_amount} {g.reward_token}
                        </span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/30 font-mono">
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Biggest Winners ────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Biggest Winners" />
        <div className="bg-white/[0.02] border border-white/10 rounded-[2px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/30">
                  <th className="px-6 py-4 w-10">#</th>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4 text-right">Total Claimed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {biggestWinners.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-white/20 font-mono text-sm">
                      No claimed rewards yet.
                    </td>
                  </tr>
                ) : biggestWinners.map((w, i) => (
                  <tr key={w.handle} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white/20 font-mono text-sm">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/profile/${w.handle}`} className="hover:text-brand-lime transition-colors">
                        <div className="font-semibold text-white text-sm">{w.display_name}</div>
                        <div className="text-[10px] font-mono text-white/30">@{w.handle}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-display font-bold text-brand-lime text-lg">{w.summary}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Recent Users + Top Organisers ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div>
          <SectionHeader title="New Users" />
          <div className="bg-white/[0.02] border border-white/10 rounded-[2px] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/30">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {(recentUsers ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/profile/${u.handle}`}
                        className="flex flex-col hover:text-brand-lime transition-colors"
                      >
                        <span className="font-semibold text-white text-sm">
                          {u.display_name}
                        </span>
                        <span className="text-[10px] font-mono text-white/30">
                          @{u.handle}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-white/30">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Organisers */}
        <div>
          <SectionHeader title="Top Organisers" />
          <div className="bg-white/[0.02] border border-white/10 rounded-[2px] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/30">
                  <th className="px-5 py-3">Organiser</th>
                  <th className="px-5 py-3 text-right">Games</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {topOrganisersList.map((o, i) => (
                  <tr key={o.handle} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/profile/${o.handle}`}
                        className="flex items-center gap-3 hover:text-brand-lime transition-colors"
                      >
                        <span className="text-[10px] font-mono text-white/20 w-4">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-white text-sm">
                            {o.display_name}
                          </span>
                          <span className="block text-[10px] font-mono text-white/30">
                            @{o.handle}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-display font-bold text-brand-lime">
                        {o.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Recent Claims ──────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Recent Reward Claims" />
        <div className="bg-white/[0.02] border border-white/10 rounded-[2px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/30">
                  <th className="px-6 py-4">Game</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Claimed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {claims.slice(0, 15).map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-semibold">
                      {(c.games as any)?.title ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-brand-lime">
                      {Number(c.amount).toFixed(2)} {c.token}
                    </td>
                    <td className="px-6 py-4">
                      {c.status === "claimed" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-brand-lime">
                          <CheckCircle2 className="w-3 h-3" /> Claimed
                        </span>
                      ) : c.status === "failed" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-yellow-400">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-white/30">
                      {c.claimed_at
                        ? new Date(c.claimed_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
                {claims.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-white/20 font-mono text-sm"
                    >
                      No claims yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
