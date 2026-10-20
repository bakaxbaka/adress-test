import { useState, useEffect, useRef, useCallback } from "react";
import {
  puzzle140,
  sweepAddress,
  watchlist,
  huntSources,
  huntPhases,
  sweepPhases,
  type Phase,
  type HuntSource,
  type Lead,
} from "./data/puzzleData";

/* ─── helpers ─── */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

function shortAddr(a: string) {
  return a.length > 16 ? `${a.slice(0, 10)}…${a.slice(-6)}` : a;
}

/* ─── Typewriter hook ─── */
function useTypewriter(lines: string[], speed = 30, startDelay = 500) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [currentLine, setCurrentLine] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (lineIdx >= lines.length) {
        setDone(true);
        return;
      }
      const line = lines[lineIdx];
      if (charIdx < line.length) {
        const t = setTimeout(() => {
          setCurrentLine((prev) => prev + line[charIdx]);
          setCharIdx((c) => c + 1);
        }, speed + Math.random() * 20);
        return () => clearTimeout(t);
      } else {
        setDisplayed((prev) => [...prev, line]);
        setCurrentLine("");
        setCharIdx(0);
        const t = setTimeout(() => setLineIdx((i) => i + 1), 100);
        return () => clearTimeout(t);
      }
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [lineIdx, charIdx, lines, speed, startDelay]);

  return { displayed, currentLine, done };
}

/* ─── Animated counter ─── */
function AnimNum({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const s = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - s) / duration, 1);
      setV(Math.round((1 - Math.pow(1 - t, 3)) * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{v}</>;
}

/* ─── Pulse dot ─── */
function PulseDot({ color = "emerald" }: { color?: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-400",
    orange: "bg-orange-400",
    red: "bg-red-400",
    blue: "bg-blue-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-400",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={cx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-50", colors[color])} />
      <span className={cx("relative inline-flex h-2.5 w-2.5 rounded-full", colors[color])} />
    </span>
  );
}

/* ─── Phase Card ─── */
function PhaseCard({ phase, onClick }: { phase: Phase; onClick: () => void }) {
  const total = phase.tasks.length;
  const done = phase.tasks.filter((t) => t.done).length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const statusColors: Record<string, string> = {
    pending: "text-gray-500 bg-gray-500/10 border-gray-500/20",
    active: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    done: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blocked: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-700/40 bg-gray-800/40 p-4 transition-all hover:bg-gray-700/50 hover:border-gray-600/60 group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", statusColors[phase.status])}>
          {phase.status}
        </span>
        <span className="text-[10px] font-bold text-gray-600">{phase.priority}</span>
      </div>
      <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
        {phase.name}
      </h4>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{phase.description}</p>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
          <span>{done}/{total} tasks</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden">
          <div
            className={cx(
              "h-full rounded-full transition-all duration-500",
              pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-orange-500" : "bg-gray-600"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

/* ─── Source Table Row ─── */
function SourceRow({ source }: { source: HuntSource }) {
  const statusIcon: Record<string, string> = {
    pending: "⏳",
    scanning: "🔄",
    done: "✅",
    error: "❌",
  };
  return (
    <tr className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
      <td className="px-3 py-2.5 text-sm font-medium text-gray-200">{source.site}</td>
      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{source.page}</td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1 flex-wrap">
          {source.exposes.map((e) => (
            <span key={e} className="rounded bg-gray-700/60 px-1.5 py-0.5 text-[10px] text-gray-400">{e}</span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{source.updateSignal}</td>
      <td className="px-3 py-2.5 text-center">
        <span className="text-sm">{statusIcon[source.status]}</span>
      </td>
      <td className="px-3 py-2.5 text-center text-xs font-bold text-orange-400">{source.hits}</td>
    </tr>
  );
}

/* ─── Lead Row ─── */
function LeadRow({ lead }: { lead: Lead }) {
  const confColors: Record<string, string> = {
    high: "text-emerald-400 bg-emerald-500/10",
    medium: "text-yellow-400 bg-yellow-500/10",
    low: "text-orange-400 bg-orange-500/10",
    unverified: "text-gray-400 bg-gray-500/10",
  };
  return (
    <tr className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
      <td className="px-3 py-2 text-xs text-gray-500 font-mono">{lead.id}</td>
      <td className="px-3 py-2 text-xs text-gray-300">{lead.source}</td>
      <td className="px-3 py-2 text-xs font-mono text-cyan-400 max-w-[200px] truncate" title={lead.identifier}>
        {shortAddr(lead.identifier)}
      </td>
      <td className="px-3 py-2">
        <span className="rounded bg-gray-700/60 px-1.5 py-0.5 text-[10px] text-gray-400">{lead.type}</span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-400 max-w-[180px] truncate" title={lead.claim}>{lead.claim}</td>
      <td className="px-3 py-2">
        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-bold", confColors[lead.confidence])}>
          {lead.confidence}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        {lead.verified ? (
          <span className="text-emerald-400">✓</span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
    </tr>
  );
}

/* ─── Terminal ─── */
function Terminal() {
  const lines = [
    "# Bitcoin Puzzle #140 — Agentic Web-Index Hunt",
    "# Target: 1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo",
    "# Sweep:  1PmAFZaBpokiMZ8TxhwMBW78s4Y1U9mEwK",
    "# Range:  2¹³⁹ – 2¹⁴⁰−1",
    "",
    "$ phase-0 --inventory-identifiers",
    "  → address:    1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo  [OK]",
    "  → range:      0x80000...fff (2¹³⁹–2¹⁴⁰−1)         [OK]",
    "  → pubkey:     PENDING (fetch from mempool.space)",
    "  → funding_tx: PENDING",
    "  → spend_tx:   PENDING (2019-05-31, 1000-sat)",
    "",
    "$ phase-1 --published-key-sweep",
    "  → google:     '1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo'  [scanning...]",
    "  → bing:       same query                              [scanning...]",
    "  → duckduckgo: html.duckduckgo.com/html/?q=...         [scanning...]",
    "  → yandex:     same query                              [scanning...]",
    "  → key DBs:    privatekeys.pw, secretscan, btcpuzzle…  [scanning...]",
    "",
    "$ sweep-A --source-inventory",
    "  → privatekeys.pw/puzzles     [OK] exposes: addr,key,bal",
    "  → keys.lol/bitcoin/...       [OK] exposes: addr,key,bal",
    "  → secretscan.org/Bitcoin_puzzle [OK] exposes: addr,key",
    "  → btcpuzzle.info/puzzle      [OK] exposes: addr,key,bal",
    "  → directory.io               [OK] exposes: addr,key,bal",
    "  → +5 more sources queued...",
    "",
    "$ sweep-E --balance-verify --target=1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo",
    "  → mempool.space:    checking...",
    "  → blockstream.info: checking...",
    "  → blockchair.com:   checking...",
    "",
    "═══════════════════════════════════════════════════════",
    "  STATUS: HUNT ACTIVE — awaiting web tool reset",
    "  NEXT:   Fetch pubkey → Phase 1 dorks → Phase 2 code search",
    "═══════════════════════════════════════════════════════",
  ];

  const { displayed, currentLine, done } = useTypewriter(lines, 18, 800);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [displayed, currentLine]);

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-950 overflow-hidden">
      <div className="flex items-center gap-2 bg-gray-900/80 border-b border-gray-700/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <span className="ml-2 text-xs text-gray-500 font-mono">puzzle-140-hunt — PowerShell 7.6.7</span>
        {!done && <span className="ml-auto text-xs text-orange-400 animate-pulse">executing…</span>}
        {done && <span className="ml-auto text-xs text-emerald-400">ready</span>}
      </div>
      <div ref={ref} className="p-4 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin">
        {displayed.map((l, i) => (
          <div
            key={i}
            className={cx(
              l.startsWith("#") ? "text-gray-500" : "",
              l.startsWith("$") ? "text-cyan-400 font-bold mt-2" : "",
              l.includes("[OK]") ? "text-emerald-400" : "",
              l.includes("PENDING") ? "text-yellow-400" : "",
              l.includes("scanning") ? "text-orange-400" : "",
              l.includes("checking") ? "text-blue-400" : "",
              l.includes("═══") ? "text-orange-400 font-bold" : "",
              l.includes("STATUS:") ? "text-orange-400 font-bold" : "",
              l.includes("HUNT ACTIVE") ? "text-orange-400" : "",
            )}
          >
            {l || "\u00A0"}
          </div>
        ))}
        {currentLine && (
          <div className="text-gray-300">
            {currentLine}
            <span className="inline-block w-2 h-3.5 bg-orange-400 animate-pulse ml-0.5 align-middle" />
          </div>
        )}
        {done && !currentLine && (
          <span className="inline-block w-2 h-3.5 bg-orange-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

/* ─── Identifier Card ─── */
function IdCard({ label, value, status, mono = true }: { label: string; value: string; status?: "ok" | "pending" | "error"; mono?: boolean }) {
  const statusEl = status === "ok" ? (
    <span className="text-emerald-400 text-[10px]">✓</span>
  ) : status === "pending" ? (
    <span className="text-yellow-400 text-[10px] animate-pulse">⏳</span>
  ) : status === "error" ? (
    <span className="text-red-400 text-[10px]">✗</span>
  ) : null;

  return (
    <div className="rounded-xl border border-gray-700/40 bg-gray-800/40 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
        {statusEl}
      </div>
      <p className={cx("text-sm break-all", mono ? "font-mono" : "", status === "pending" ? "text-yellow-400/70" : "text-gray-200")}>
        {value}
      </p>
    </div>
  );
}

/* ─── Tab Button ─── */
function TabBtn({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "rounded-lg px-4 py-2 text-sm font-medium transition-all",
        active
          ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
          : "text-gray-500 hover:text-gray-300 border border-transparent"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cx("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-orange-500/20" : "bg-gray-700/60")}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Watchlist Monitor ─── */
function WatchlistMonitor() {
  return (
    <div className="space-y-2">
      {watchlist.map((addr, i) => (
        <div key={addr} className="flex items-center gap-3 rounded-lg border border-gray-700/40 bg-gray-800/30 px-4 py-3">
          <PulseDot color={i === 1 ? "orange" : i === 2 ? "blue" : "emerald"} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">
              {i === 0 ? "Test Address" : i === 1 ? "Puzzle #140" : "Sweep Target"}
            </p>
            <p className="text-sm font-mono text-gray-200 truncate">{addr}</p>
          </div>
          <span className={cx(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            i === 1 ? "bg-orange-500/15 text-orange-400" : "bg-gray-700/60 text-gray-500"
          )}>
            {i === 1 ? "HUNT" : "WATCH"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [tab, setTab] = useState<"overview" | "hunt" | "sweep" | "leads" | "sources">("overview");
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [leads] = useState<Lead[]>([
    { id: "L-001", source: "Phase 0", identifier: puzzle140.address, type: "address", claim: "Target address confirmed", confidence: "high", verified: true, timestamp: "2026-01-15T00:00:00Z" },
    { id: "L-002", source: "Phase 0", identifier: "0x80000000000000000000000000000000000", type: "range-hex", claim: "Range start confirmed (2¹³⁹)", confidence: "high", verified: true, timestamp: "2026-01-15T00:01:00Z" },
    { id: "L-003", source: "Phase 0", identifier: "fffffffffffffffffffffffffffffffffff", type: "range-hex", claim: "Range end confirmed (2¹⁴⁰−1)", confidence: "high", verified: true, timestamp: "2026-01-15T00:02:00Z" },
    { id: "L-004", source: "Phase 1", identifier: "google:1QKBaU6W...", type: "address", claim: "No published key found in search", confidence: "medium", verified: false, timestamp: "2026-01-15T00:10:00Z" },
    { id: "L-005", source: "Sweep-A", identifier: "privatekeys.pw/puzzles", type: "address", claim: "Source indexed, no #140 key visible", confidence: "medium", verified: false, timestamp: "2026-01-15T00:15:00Z" },
    { id: "L-006", source: "Sweep-A", identifier: "secretscan.org/Bitcoin_puzzle", type: "address", claim: "Source indexed, awaiting scan", confidence: "low", verified: false, timestamp: "2026-01-15T00:16:00Z" },
  ]);

  const toggleTask = useCallback((phaseId: string, taskIdx: number) => {
    setSelectedPhase((prev) => {
      if (!prev) return prev;
      if (prev.id !== phaseId) return prev;
      const newTasks = [...prev.tasks];
      newTasks[taskIdx] = { ...newTasks[taskIdx], done: !newTasks[taskIdx].done };
      return { ...prev, tasks: newTasks };
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* BG */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-orange-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-red-500/4 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-purple-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-xl font-bold shadow-lg shadow-orange-500/20">
                🔍
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  Puzzle #140 — Agentic Hunt
                </h1>
                <p className="text-[11px] text-gray-500 hidden sm:block">
                  Web-Index Sweep · 1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-400 border border-orange-500/20">
                <PulseDot color="orange" />
                Hunt Active
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1 scrollbar-thin">
            <TabBtn active={tab === "overview"} label="Overview" onClick={() => setTab("overview")} />
            <TabBtn active={tab === "hunt"} label="Hunt Phases" count={huntPhases.length} onClick={() => setTab("hunt")} />
            <TabBtn active={tab === "sweep"} label="Sweep Phases" count={sweepPhases.length} onClick={() => setTab("sweep")} />
            <TabBtn active={tab === "leads"} label="Leads" count={leads.length} onClick={() => setTab("leads")} />
            <TabBtn active={tab === "sources"} label="Sources" count={huntSources.length} onClick={() => setTab("sources")} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <>
            {/* Target info */}
            <section className="rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-red-500/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h2 className="text-lg font-bold">Target: Puzzle #140</h2>
                <span className="ml-auto rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-400">
                  2¹³⁹ – 2¹⁴⁰−1
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <IdCard label="Address" value={puzzle140.address} status="ok" />
                <IdCard label="Range Start" value={puzzle140.rangeStart} status="ok" />
                <IdCard label="Range End" value={puzzle140.rangeEnd} status="ok" />
                <IdCard label="Compressed Pubkey" value={puzzle140.pubkey || "PENDING — fetch from mempool.space"} status="pending" />
                <IdCard label="Funding Txid" value={puzzle140.fundingTxid || "PENDING"} status="pending" />
                <IdCard label="Spend Txid (1000-sat)" value={puzzle140.spendTxid || "PENDING — 2019-05-31 tx"} status="pending" />
              </div>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-700/40 bg-gray-800/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Hunt Phases</p>
                <p className="text-2xl font-bold text-white"><AnimNum value={huntPhases.length} /></p>
                <p className="text-xs text-gray-500 mt-1">8 phases · P0–P1</p>
              </div>
              <div className="rounded-xl border border-gray-700/40 bg-gray-800/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Sweep Phases</p>
                <p className="text-2xl font-bold text-white"><AnimNum value={sweepPhases.length} /></p>
                <p className="text-xs text-gray-500 mt-1">9 phases · A–I</p>
              </div>
              <div className="rounded-xl border border-gray-700/40 bg-gray-800/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Sources</p>
                <p className="text-2xl font-bold text-white"><AnimNum value={huntSources.length} /></p>
                <p className="text-xs text-gray-500 mt-1">key-search sites</p>
              </div>
              <div className="rounded-xl border border-gray-700/40 bg-gray-800/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Leads</p>
                <p className="text-2xl font-bold text-orange-400"><AnimNum value={leads.length} /></p>
                <p className="text-xs text-gray-500 mt-1">tracked identifiers</p>
              </div>
            </section>

            {/* Terminal */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Execution Console
              </h2>
              <Terminal />
            </section>

            {/* Watchlist + Sweep target */}
            <div className="grid lg:grid-cols-2 gap-4">
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Watchlist Monitor
                </h2>
                <WatchlistMonitor />
              </section>
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Sweep Address
                </h2>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PulseDot color="blue" />
                    <span className="text-sm font-semibold text-blue-400">Active Sweep Target</span>
                  </div>
                  <p className="font-mono text-sm text-gray-200 break-all">{sweepAddress.address}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Cross-referencing against all 160 puzzle addresses and watchlist.
                    Balance verification via mempool.space + blockstream.info.
                  </p>
                </div>
              </section>
            </div>

            {/* Exit conditions */}
            <section className="rounded-2xl border border-gray-700/40 bg-gray-800/30 p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Exit Conditions
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-semibold text-emerald-400 mb-1">✓ Success</p>
                  <p className="text-xs text-gray-400">
                    Full #140 key string found and address-verified → hunt complete.
                    Funded address maps to derivable key → chase it.
                    Puzzle balance drops → swept/solved → grab announced key.
                  </p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-sm font-semibold text-red-400 mb-1">✗ Exhaustion</p>
                  <p className="text-xs text-gray-400">
                    All phases exhausted with only "no" answers → key is genuinely
                    unpublished. #140 becomes a pure 2¹³⁹/2⁷⁰ compute problem.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ═══ HUNT PHASES TAB ═══ */}
        {tab === "hunt" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Hunt Phases (0–7)</h2>
              <span className="text-xs text-gray-500">
                {huntPhases.reduce((a, p) => a + p.tasks.filter((t) => t.done).length, 0)}
                /{huntPhases.reduce((a, p) => a + p.tasks.length, 0)} tasks complete
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {huntPhases.map((p) => (
                <PhaseCard key={p.id} phase={p} onClick={() => setSelectedPhase(p)} />
              ))}
            </div>

            {/* Phase detail */}
            {selectedPhase && selectedPhase.id.startsWith("phase") && (
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/40 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{selectedPhase.name}</h3>
                    <p className="text-xs text-gray-500">{selectedPhase.description}</p>
                  </div>
                  <button onClick={() => setSelectedPhase(null)} className="text-gray-500 hover:text-white text-xl">×</button>
                </div>
                <div className="space-y-2">
                  {selectedPhase.tasks.map((t, i) => (
                    <label key={i} className="flex items-center gap-3 rounded-lg bg-gray-900/40 px-4 py-3 cursor-pointer hover:bg-gray-900/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(selectedPhase.id, i)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500/30"
                      />
                      <span className={cx("text-sm", t.done ? "text-gray-500 line-through" : "text-gray-300")}>
                        {t.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ SWEEP PHASES TAB ═══ */}
        {tab === "sweep" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Sweep Phases (A–I)</h2>
              <span className="text-xs text-gray-500">
                {sweepPhases.reduce((a, p) => a + p.tasks.filter((t) => t.done).length, 0)}
                /{sweepPhases.reduce((a, p) => a + p.tasks.length, 0)} tasks complete
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sweepPhases.map((p) => (
                <PhaseCard key={p.id} phase={p} onClick={() => setSelectedPhase(p)} />
              ))}
            </div>

            {selectedPhase && selectedPhase.id.startsWith("sweep") && (
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/40 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{selectedPhase.name}</h3>
                    <p className="text-xs text-gray-500">{selectedPhase.description}</p>
                  </div>
                  <button onClick={() => setSelectedPhase(null)} className="text-gray-500 hover:text-white text-xl">×</button>
                </div>
                <div className="space-y-2">
                  {selectedPhase.tasks.map((t, i) => (
                    <label key={i} className="flex items-center gap-3 rounded-lg bg-gray-900/40 px-4 py-3 cursor-pointer hover:bg-gray-900/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(selectedPhase.id, i)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500/30"
                      />
                      <span className={cx("text-sm", t.done ? "text-gray-500 line-through" : "text-gray-300")}>
                        {t.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ LEADS TAB ═══ */}
        {tab === "leads" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Lead Table</h2>
              <span className="text-xs text-gray-500">{leads.length} leads tracked</span>
            </div>
            <div className="rounded-2xl border border-gray-700/50 bg-gray-800/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-900/40">
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">ID</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Source</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Identifier</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Type</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Claim</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Confidence</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500 text-center">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <LeadRow key={l.id} lead={l} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Execution rules */}
            <section className="rounded-2xl border border-gray-700/40 bg-gray-800/30 p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Execution Rules
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-400">
                <div className="flex gap-2">
                  <span className="text-orange-400">→</span>
                  <span>Parallelize: batch 4–6 queries per engine per pass; all engines at once</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">→</span>
                  <span>Tool down → fallback: paste raw result pages for parsing</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">→</span>
                  <span>Every hit validates offline before it's called a lead</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">→</span>
                  <span>Dedupe aggressively — same gist gets mirrored everywhere</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">→</span>
                  <span>For seed/path leads: run offline BIP32/Electrum derivation</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-orange-400">→</span>
                  <span>Test against all #1–#135 keys and the #140 address</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ═══ SOURCES TAB ═══ */}
        {tab === "sources" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Source Inventory</h2>
              <span className="text-xs text-gray-500">{huntSources.length} sites tracked</span>
            </div>
            <div className="rounded-2xl border border-gray-700/50 bg-gray-800/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-900/40">
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Site</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Page</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Exposes</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500">Update Signal</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500 text-center">Status</th>
                      <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-gray-500 text-center">Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {huntSources.map((s) => (
                      <SourceRow key={s.id} source={s} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Copy-paste starters */}
            <section className="rounded-2xl border border-gray-700/40 bg-gray-800/30 p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Copy-Paste Starters (PowerShell / Python)
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Change-detect one page:</p>
                  <pre className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 text-xs text-cyan-400 font-mono overflow-x-auto scrollbar-thin">
{`$u = "https://privatekeys.pw/puzzles"
$h = (Invoke-WebRequest $u).Content
$sha = [BitConverter]::ToString(
  (New-Object Security.Cryptography.SHA256Managed)
    .ComputeHash([Text.Encoding]::UTF8.GetBytes($h))
) -replace '-',''
"$sha  $u" | Tee-Object -Append hashes.txt`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Balance check (Python):</p>
                  <pre className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 text-xs text-emerald-400 font-mono overflow-x-auto scrollbar-thin">
{`import requests
def bal(a):
    r = requests.get(
        f"https://mempool.space/api/address/{a}", timeout=15
    ).json()
    cs = r["chain_stats"]
    return cs["funded_txo_sum"] - cs["spent_txo_sum"], cs["tx_count"]`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">CDX cadence probe:</p>
                  <pre className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 text-xs text-purple-400 font-mono overflow-x-auto scrollbar-thin">
{`Invoke-RestMethod "http://web.archive.org/cdx/search/cdx?url=privatekeys.pw/puzzles&output=json&limit=50"`}
                  </pre>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <span>Puzzle #140 Agentic Hunt Dashboard</span>
          <span>Target: 1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo · Sweep: 1PmAFZaBpokiMZ8TxhwMBW78s4Y1U9mEwK</span>
        </div>
      </footer>
    </div>
  );
}
