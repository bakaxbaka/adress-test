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
  const [tab, setTab] = useState<"overview" | "hunt" | "sweep" | "leads" | "sources" | "scanner">("overview");
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
            <TabBtn active={tab === "scanner"} label="GH Scanner" onClick={() => setTab("scanner")} />
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

        {/* ═══ GITHUB SCANNER TAB ═══ */}
        {tab === "scanner" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Global GitHub PR Scanner</h2>
              <span className="text-xs text-gray-500">Scanning all public PRs for Puzzle #140 clues</span>
            </div>

            {/* Global search query banner */}
            <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-red-500/5 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-2xl">
                  🌐
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-orange-400 mb-2">
                    Stage 1: Global PR Discovery
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Search <strong className="text-gray-300">all public GitHub PRs</strong> (not scoped to a single repo) for the comment phrase.
                    GitHub's issue/PR search works globally across the entire platform.
                  </p>
                  <div className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 font-mono text-sm text-cyan-400">
                    is:pr "This PR was created" in:comments
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      <strong>Limitation:</strong> GitHub caps search results at 1,000 items. This finds PR metadata only — not the code diffs inside them.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Live intel: composition breakdown */}
            <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📊</span>
                <h3 className="text-base font-bold text-emerald-400">
                  Live Intel — Composition Breakdown (Oct 20, 2026)
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Verified against the live GitHub API. Dropping <code className="text-cyan-400">in:comments</code> broadens the search
                (title + body + comments) and flips the dominant source entirely.
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl bg-gray-900/60 border border-gray-700/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Total PRs</p>
                  <p className="text-2xl font-bold text-white">130,653</p>
                  <p className="text-[10px] text-gray-500 mt-1">created:≥2026-09-20</p>
                </div>
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">Qwen Bot</p>
                  <p className="text-2xl font-bold text-blue-400">115,441</p>
                  <p className="text-[10px] text-gray-500 mt-1">88.4% — agent scaffolds</p>
                </div>
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">Auto-Update Bots</p>
                  <p className="text-2xl font-bold text-purple-400">15,207</p>
                  <p className="text-[10px] text-gray-500 mt-1">11.6% — lockfile sync</p>
                </div>
                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Residue</p>
                  <p className="text-2xl font-bold text-orange-400">5</p>
                  <p className="text-[10px] text-gray-500 mt-1">0.004% — human/unknown</p>
                </div>
              </div>

              {/* Horizontal bar chart */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-700/50 p-4">
                <p className="text-xs text-gray-400 mb-3">Composition (stacked)</p>
                <div className="h-8 rounded-lg overflow-hidden flex">
                  <div className="bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white" style={{width: "88.4%"}}>
                    Qwen 88.4%
                  </div>
                  <div className="bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white" style={{width: "11.6%"}}>
                    Auto 11.6%
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>qwen-chat coder (agent scaffolds — real code, may contain keys)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>automated updates (manifests, lockfiles)</span>
                  </div>
                </div>
              </div>

              {/* Residue query */}
              <div className="mt-4 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <p className="text-xs text-orange-400 font-semibold mb-2">
                  🔍 Residue Query — The 5 Non-Bot PRs (scan these first)
                </p>
                <code className="text-[11px] text-cyan-400 font-mono break-all">
                  is:pr "This PR was created" -"qwen-chat coder" -automatically created:≥2026-09-20
                </code>
                <p className="text-[10px] text-gray-500 mt-2">
                  Only 5 PRs. Scan these by hand in seconds — they're the most likely to be genuine human/bot-unknown.
                </p>
              </div>

              {/* Key insight */}
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-gray-400">
                <strong className="text-emerald-400">Key Insight:</strong> The qwen bot PRs are <strong className="text-gray-300">real agent-authored code changes</strong>, not lockfile bumps.
                A coding agent scaffolding an app is exactly the kind of thing that commits a <code className="text-cyan-400">deploy.ts</code> with a keypair in it.
                Scan everything, but expect hits to concentrate in the blue band (qwen scaffolds).
              </div>
            </section>

            {/* Two-stage pipeline */}
            <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Two-Stage Pipeline
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-sm font-bold text-cyan-400">1</span>
                    <h4 className="text-sm font-bold text-cyan-400">Find PRs Globally</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Use GitHub's global search to find all PRs containing the comment phrase.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Query: <code className="text-cyan-400">is:pr "This PR was created" in:comments</code></li>
                    <li>• Tools: GitHub UI, <code className="text-cyan-400">gh</code> CLI, or API</li>
                    <li>• Output: List of repo + PR number pairs</li>
                    <li>• Limit: 1,000 results max per query</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-sm font-bold text-purple-400">2</span>
                    <h4 className="text-sm font-bold text-purple-400">Scan Each PR's Diff</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    For each PR found, fetch its diff and scan for Solana key patterns.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Fetch diff: <code className="text-purple-400">gh pr diff $PR --repo $REPO</code></li>
                    <li>• Scan with: <code className="text-purple-400">cipher-solana-wallet-audit</code></li>
                    <li>• Or: Custom grep with regex patterns</li>
                    <li>• Output: Annotated findings per PR</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-gray-900/40 border border-gray-700/50 text-xs text-gray-400">
                <strong className="text-gray-300">Why two stages?</strong> GitHub's code search does not index PR diffs or comments.
                You cannot combine <code className="text-cyan-400">is:pr</code> with Solana key patterns in a single query.
                The global search finds candidates; the scanner inspects their actual code.
              </div>
            </section>

            {/* Solana key patterns */}
            <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Stage 2: Solana Key Patterns to Detect
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔢</span>
                    <h4 className="text-sm font-bold text-orange-400">64-Byte Numeric Arrays</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Classic Solana keypair JSON format — 64 integers (0-255)
                  </p>
                  <code className="text-[10px] text-orange-300 font-mono break-all">
                    {"["}\\s*[0-9]{"{1,3}"}(\\s*,\\s*[0-9]{"{1,3}"}){"{63}"}\\s*{"]"}
                  </code>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Example: [123, 45, 67, ..., 99] (64 elements)
                  </p>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔐</span>
                    <h4 className="text-sm font-bold text-purple-400">Base58 Private Keys</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    64-byte keys encoded as 87-88 char Base58 strings
                  </p>
                  <code className="text-[10px] text-purple-300 font-mono break-all">
                    [1-9A-HJ-NP-Za-km-z]{"{87,88}"}
                  </code>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Example: 5Kb8kLf9zgWQnogidDA76MzPL6TsZZY36hWXMssSzNydYXYG9KF
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📍</span>
                    <h4 className="text-sm font-bold text-cyan-400">Hardcoded Base58 Strings</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    32-44 char Base58 strings (addresses or public keys)
                  </p>
                  <code className="text-[10px] text-cyan-300 font-mono break-all">
                    [1-9A-HJ-NP-Za-km-z]{"{32,44}"}
                  </code>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Worth reviewing — may be addresses or public keys
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-400">
                <strong>⚠ Invalid Pattern:</strong> The "even-index filter" (checking byte offset parity) has been intentionally omitted.
                Byte offset parity has no bearing on key validity — this was a false lead.
              </div>
            </section>

            {/* Purpose-built tool banner */}
            <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl">
                  🛡️
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-emerald-400">
                      cipher-solana-wallet-audit
                    </h3>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      FREE · OSS · MIT
                    </span>
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                      v1.4.0
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Purpose-built GitHub Action by{" "}
                    <span className="text-cyan-400">cryptomotifs</span> that scans repos
                    for wallet-security anti-patterns during CI. Zero runtime deps (Python 3.11 stdlib only).
                    Its ruleset directly overlaps with what we need for Bitcoin puzzle hunting —
                    no custom pipeline required.
                  </p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <a href="https://github.com/cryptomotifs/cipher-solana-wallet-audit" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      View on GitHub
                    </a>
                    <a href="https://github.com/marketplace/actions/cipher-solana-wallet-audit" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
                      🏪 Marketplace
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Rule mapping table */}
            <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 overflow-hidden">
              <div className="bg-gray-900/40 border-b border-gray-700/50 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-300">
                  Rule Mapping — Cipher Rules → Puzzle #140 Relevance
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Which of the tool's 13 rules catch patterns that could contain the #140 private key
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-900/30">
                      <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500">Rule ID</th>
                      <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500">Severity</th>
                      <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500">What it catches</th>
                      <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500">Puzzle #140 relevance</th>
                      <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 text-center">Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800/40 bg-emerald-500/5">
                      <td className="px-3 py-2.5 text-xs font-mono font-bold text-emerald-400">JSON_KEYPAIR</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">64-integer arrays (Solana CLI keypair JSON)</td>
                      <td className="px-3 py-2.5 text-xs text-emerald-400 font-medium">🎯 Exact match — same 64-byte array shape as Bitcoin privkey</td>
                      <td className="px-3 py-2.5 text-center text-emerald-400 font-bold">★★★</td>
                    </tr>
                    <tr className="border-b border-gray-800/40 bg-emerald-500/5">
                      <td className="px-3 py-2.5 text-xs font-mono font-bold text-emerald-400">PLAINTEXT_KEY</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">Base58 strings 86–90 chars long</td>
                      <td className="px-3 py-2.5 text-xs text-emerald-400 font-medium">🎯 Catches WIF private keys (same charset, similar length)</td>
                      <td className="px-3 py-2.5 text-center text-emerald-400 font-bold">★★★</td>
                    </tr>
                    <tr className="border-b border-gray-800/40 bg-emerald-500/5">
                      <td className="px-3 py-2.5 text-xs font-mono font-bold text-emerald-400">HEX_PRIVATE_KEY</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">64/128-char hex assigned to private_key identifiers</td>
                      <td className="px-3 py-2.5 text-xs text-emerald-400 font-medium">🎯 Raw hex private keys (Bitcoin uses 256-bit = 64 hex chars)</td>
                      <td className="px-3 py-2.5 text-center text-emerald-400 font-bold">★★★</td>
                    </tr>
                    <tr className="border-b border-gray-800/40 bg-yellow-500/5">
                      <td className="px-3 py-2.5 text-xs font-mono font-bold text-yellow-400">SEED_IN_COMMENT</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">12/24-word BIP39 phrase in a comment</td>
                      <td className="px-3 py-2.5 text-xs text-yellow-400 font-medium">⚡ BIP39 is chain-agnostic — could be the deterministic wallet seed</td>
                      <td className="px-3 py-2.5 text-center text-yellow-400 font-bold">★★☆</td>
                    </tr>
                    <tr className="border-b border-gray-800/40 bg-yellow-500/5">
                      <td className="px-3 py-2.5 text-xs font-mono font-bold text-yellow-400">MNEMONIC_IN_STRING</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">BIP39 phrase as string literal (mnemonic/seed vars)</td>
                      <td className="px-3 py-2.5 text-xs text-yellow-400 font-medium">⚡ Same — catches seed phrases assigned to variables</td>
                      <td className="px-3 py-2.5 text-center text-yellow-400 font-bold">★★☆</td>
                    </tr>
                    <tr className="border-b border-gray-800/40">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">ENV_LEAK</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">high</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">.env file not covered by .gitignore</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">Low — keys rarely in .env for puzzle hunters</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">★☆☆</td>
                    </tr>
                    <tr className="border-b border-gray-800/40">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">SOLANA_CONFIG_KEYPAIR</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">Tracked id.json / *-keypair.json files</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">Low — Solana-specific filenames</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">★☆☆</td>
                    </tr>
                    <tr className="border-b border-gray-800/40">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">HARDCODED_RPC</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">medium</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">RPC URL with embedded API key</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">None — not relevant to puzzle keys</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">—</td>
                    </tr>
                    <tr className="border-b border-gray-800/40">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">ANCHOR_WALLET_LEAK</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">Anchor.toml wallet resolves to committed keypair</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">None — Solana Anchor-specific</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">—</td>
                    </tr>
                    <tr className="border-b border-gray-800/40">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">NONCE_ADVANCE_IN_MULTISIG</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">critical</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">Drift-hack nonce pattern</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">None — Solana-specific attack pattern</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">—</td>
                    </tr>
                    <tr className="border-b border-gray-800/40">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">T22_TRANSFER_HOOK_ABUSE</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">medium</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">Token2022 transfer hook abuse</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">None — Solana Token2022-specific</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-900/30 border-t border-gray-700/50 px-4 py-3 flex items-center gap-4 text-xs">
                <span className="text-emerald-400 font-bold">5 rules directly relevant</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">3 marginal</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">5 not applicable (Solana-specific)</span>
              </div>
            </section>

            {/* How to use it */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Option A: Run as GitHub Action */}
              <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-sm font-bold text-emerald-400">A</span>
                  <h3 className="text-sm font-bold text-gray-200">Run as GitHub Action on Target PRs</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Create a workflow that runs the scanner against each PR you identify.
                  Annotates the diff inline — no log-digging needed.
                </p>
                <pre className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 text-xs text-cyan-400 font-mono overflow-x-auto scrollbar-thin leading-relaxed">
{`# .github/workflows/puzzle-scan.yml
name: Puzzle #140 Scanner
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cryptomotifs/cipher-solana-wallet-audit@v1
        with:
          fail-on: critical
          # Scan everything — puzzle keys hide anywhere
          include: '**/*'
          exclude: 'node_modules/**,.git/**'`}
                </pre>
              </section>

              {/* Option B: Fork & adapt */}
              <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-sm font-bold text-orange-400">B</span>
                  <h3 className="text-sm font-bold text-gray-200">Fork & Adapt patterns.py for Bitcoin</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  The scanner is pure Python (stdlib only). Fork it, add
                  Bitcoin-specific rules, then run locally against cloned repos.
                </p>
                <pre className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 text-xs text-orange-400 font-mono overflow-x-auto scrollbar-thin leading-relaxed">
{`# Add to patterns.py in your fork:
BTC_RULES = {
  "BTC_WIF_KEY": {
    "severity": "critical",
    # WIF: 51-52 chars starting with 5/K/L
    "pattern": r'[5KL][1-9A-HJ-NP-Za-km-z]{50,51}',
    "desc": "Bitcoin WIF private key"
  },
  "BTC_HEX_PRIVKEY": {
    "severity": "critical",
    # 64 hex chars = 256-bit key
    "pattern": r'(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])',
    "context": r'(?:priv|secret|key|wallet)',
    "desc": "Raw 256-bit private key (hex)"
  },
  "BTC_64BYTE_ARRAY": {
    "severity": "critical",
    # Same as JSON_KEYPAIR — 64 bytes
    "pattern": r'\\[\\s*\\d{1,3}(?:\\s*,\\s*\\d{1,3}){63}\\s*\\]',
    "desc": "64-byte array (privkey bytes)"
  }
}`}
                </pre>
              </section>
            </div>

            {/* Option C: Revised script with datetime bisection */}
            <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-sm font-bold text-purple-400">C</span>
                <h3 className="text-sm font-bold text-gray-200">
                  Revised Script — Datetime Bisection (130k PRs)
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                At 130k PRs, date-granularity split gives ~5,500/day per leaf — still 5.5x over the cap.
                Bisect on <strong className="text-gray-300">datetime</strong>, not date. <code className="text-cyan-400">created:</code> accepts full ISO-8601 timestamps.
              </p>
              <pre className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 text-xs text-purple-400 font-mono overflow-x-auto scrollbar-thin leading-relaxed">
{`#!/usr/bin/env python3
import os, re, json, time, sqlite3, sys
from datetime import datetime, timezone, timedelta
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from concurrent.futures import ThreadPoolExecutor, as_completed

TOKEN  = os.environ.get("GITHUB_TOKEN", "")
PHRASE = 'is:pr "This PR was created"'          # no in:comments
CAP    = 1000
WORKERS = 24
RATE_S = 2.1        # authenticated search = 30 req/min

START = datetime(2026, 9, 20, tzinfo=timezone.utc)
END   = datetime(2026, 10, 20, 23, 59, 59, tzinfo=timezone.utc)

HDRS = {"Accept": "application/vnd.github+json", "User-Agent": "pr-solana-scan"}
if TOKEN:
    HDRS["Authorization"] = f"Bearer {TOKEN}"

def iso(dt): return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

db = sqlite3.connect("scan.db")
db.executescript("""
  CREATE TABLE IF NOT EXISTS prs(repo TEXT, num INT, url TEXT, scanned INT DEFAULT 0,
                                 PRIMARY KEY(repo, num));
  CREATE TABLE IF NOT EXISTS hits(repo TEXT, num INT, url TEXT, kind TEXT,
                                  line TEXT, PRIMARY KEY(repo, num, kind, line));
""")

def _get(url):
    for a in range(6):
        try:
            with urlopen(Request(url, headers=HDRS), timeout=30) as r:
                return json.load(r)
        except Exception:
            if a == 5: raise
            time.sleep(2 ** a)

def search_count(q):
    n = _get("https://api.github.com/search/issues?" + urlencode({"q": q, "per_page": 1}))["total_count"]
    time.sleep(RATE_S)
    return n

def harvest(q):
    page, got = 1, 0
    while True:
        d = _get("https://api.github.com/search/issues?" +
                 urlencode({"q": q, "per_page": 100, "page": page}))
        items = d.get("items", [])
        if not items: break
        db.executemany("INSERT OR IGNORE INTO prs(repo,num,url) VALUES(?,?,?)",
            [(i["repository_url"].split("/repos/")[1], i["number"],
              i["pull_request"]["diff_url"]) for i in items])
        db.commit(); got += len(items)
        if len(items) < 100: break
        page += 1; time.sleep(RATE_S)
    return got

def enum(lo, hi, depth=0):
    """Bisect a datetime window until each leaf fits under the 1000 cap."""
    q = f"{PHRASE} created:{iso(lo)}..{iso(hi)}"
    n = search_count(q)
    if n == 0: return 0
    if n <= CAP or (hi - lo) <= timedelta(seconds=2):
        print(f"  leaf {iso(lo)}..{iso(hi)}  ({n})", flush=True)
        return harvest(q)
    mid = lo + (hi - lo) / 2
    return enum(lo, mid, depth+1) + enum(mid + timedelta(seconds=1), hi, depth+1)

# ---- patterns: byte-constrained array, lookarounded base58 ----
B   = r"(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)"
B58 = "[1-9A-HJ-NP-Za-km-z]"
PATTERNS = [
    ("json64",    re.compile(rf"\\[[ \\t]*{B}(?:[ \\t]*,[ \\t]*{B}){{63}}[ \\t]*\\]")),
    ("b58secret", re.compile(rf"(?<!{B58}){B58}{{87,88}}(?!{B58})")),
    ("b58pub",    re.compile(rf"(?<!{B58}){B58}{{43,44}}(?!{B58})")),
]

def scan_one(row):
    repo, num, url = row
    try:
        with urlopen(Request(url, headers={"User-Agent": "pr-solana-scan"}), timeout=45) as r:
            diff = r.read().decode("utf-8", "replace")
    except Exception as e:
        print(f"  ! {repo}#{num}: {e}", file=sys.stderr, flush=True); return
    for kind, pat in PATTERNS:
        for m in pat.finditer(diff):
            line = diff[max(0, m.start()-80): m.end()+40].replace("\\n", " ")
            db.execute("INSERT OR IGNORE INTO hits VALUES(?,?,?,?,?)",
                       (repo, num, f"https://github.com/{repo}/pull/{num}", kind, line[:300]))
    db.execute("UPDATE prs SET scanned=1 WHERE repo=? AND num=?", (repo, num)); db.commit()

if __name__ == "__main__":
    todo = db.execute("SELECT repo,num,url FROM prs WHERE scanned=0").fetchall()
    if not todo:
        print(f"Enumerating {iso(START)} .. {iso(END)} ...")
        print("total:", enum(START, END))
        todo = db.execute("SELECT repo,num,url FROM prs WHERE scanned=0").fetchall()
    print(f"Scanning {len(todo)} diffs ...")
    with ThreadPoolExecutor(WORKERS) as ex:
        for i, _ in enumerate(as_completed([ex.submit(scan_one, r) for r in todo]), 1):
            if i % 2000 == 0: print(f"  {i}/{len(todo)}", flush=True)
    print("\\n--- hits by kind ---")
    for kind, c in db.execute("SELECT kind, COUNT(*) FROM hits GROUP BY kind ORDER BY 2 DESC"):
        print(f"  {kind:10} {c}")`}
              </pre>
            </section>

            {/* Cost estimates */}
            <section className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⏱️</span>
                <h3 className="text-base font-bold text-yellow-400">
                  Cost & Time Estimates
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-900/60 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Enumeration Phase</p>
                  <ul className="text-xs text-gray-400 space-y-1.5">
                    <li className="flex justify-between">
                      <span>Count calls:</span>
                      <span className="text-white font-mono">~260</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Result pages:</span>
                      <span className="text-white font-mono">~1,310</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Total search requests:</span>
                      <span className="text-white font-mono">~1,570</span>
                    </li>
                    <li className="flex justify-between border-t border-gray-700/50 pt-1.5 mt-1.5">
                      <span className="font-semibold">Time (authenticated 30/min):</span>
                      <span className="text-emerald-400 font-bold">~55 min</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Time (unauthenticated 10/min):</span>
                      <span className="text-red-400 font-bold">~2.5 hours</span>
                    </li>
                  </ul>
                  <p className="text-[10px] text-yellow-400 mt-2">⚠ Get a token. Unauthenticated is too slow.</p>
                </div>
                <div className="rounded-xl bg-gray-900/60 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Diff Scan Phase</p>
                  <ul className="text-xs text-gray-400 space-y-1.5">
                    <li className="flex justify-between">
                      <span>Total diffs to fetch:</span>
                      <span className="text-white font-mono">130,000</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Workers:</span>
                      <span className="text-white font-mono">24</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Avg time per fetch:</span>
                      <span className="text-white font-mono">~0.4s</span>
                    </li>
                    <li className="flex justify-between border-t border-gray-700/50 pt-1.5 mt-1.5">
                      <span className="font-semibold">Total time:</span>
                      <span className="text-emerald-400 font-bold">1–2 hours</span>
                    </li>
                  </ul>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Diff fetches use github.com/.../pull/N.diff — no API quota.
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-gray-900/60 border border-gray-700/50">
                <p className="text-xs text-gray-400 mb-2 font-semibold">Bisection Details</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• 130k → 1k needs <strong className="text-white">7 levels</strong> of bisection</li>
                  <li>• Expect <strong className="text-white">~130 leaf windows</strong></li>
                  <li>• <code className="text-cyan-400">timedelta(seconds=2)</code> floor guards against runaway split if one second exceeds cap</li>
                  <li>• <code className="text-cyan-400">scan.db</code> resume behavior matters at this scale — scan will get interrupted</li>
                </ul>
              </div>
            </section>

            {/* Sanity check */}
            <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🔬</span>
                <h3 className="text-sm font-bold text-gray-200">
                  Sanity Check — Signal Calibration
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Pulled the top result's diff (<code className="text-cyan-400">sae-space-ai/geo-marte-3d#2</code>, a qwen agent scaffold — 717 modules, full TS app):
              </p>
              <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-3 mb-3">
                <p className="text-xs text-gray-400">
                  <strong className="text-gray-300">Result:</strong> <span className="text-emerald-400 font-bold">Zero Solana matches</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  It's a React/Three.js app with a sql.js backend, no wallet code. That's representative — a qwen agent builds whatever the task asked for,
                  and most tasks aren't Solana.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-gray-400">
                <strong className="text-blue-400">Expectation:</strong> <code className="text-cyan-400">json64</code> hits will be genuinely rare.
                <code className="text-cyan-400 ml-1">b58pub</code> hits will be dominated by noise.
              </div>
              <div className="mt-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 text-xs text-orange-400">
                <strong>💡 Recommendation:</strong> Before committing 2 hours, run enumeration only, then scan the first 2,000 diffs and extrapolate the <code>json64</code> rate.
              </div>
            </section>

            {/* Simulated scan output with cipher rules */}
            <section className="rounded-2xl border border-gray-700/50 bg-gray-800/30 overflow-hidden">
              <div className="bg-gray-900/40 border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">Simulated Output — Cipher Scanner on PR Diff</h3>
                <span className="text-xs text-gray-500">GitHub annotation format</span>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin">
                <div className="text-gray-500">$ python src/patterns.py /tmp/pr_diff.txt</div>
                <div className="mt-3 space-y-1.5">
                  <div className="text-red-400">
                    ::error file=test/key_tests.cpp,line=142,title=JSON_KEYPAIR (critical)::64-integer array detected — likely keypair bytes
                  </div>
                  <div className="text-red-400">
                    ::error file=test/data/keys.json,line=87,title=PLAINTEXT_KEY (critical)::Likely plaintext private key (base58, 52 chars, starts with 5)
                  </div>
                  <div className="text-red-400">
                    ::error file=contrib/seeds/bip39_test.txt,line=23,title=SEED_IN_COMMENT (critical)::12-word BIP39 phrase detected in comment block
                  </div>
                  <div className="text-red-400">
                    ::error file=src/wallet/test.cpp,line=301,title=HEX_PRIVATE_KEY (critical)::64-char hex literal assigned to 'private_key' variable
                  </div>
                  <div className="text-orange-400">
                    ::warning file=.env,line=1,title=ENV_LEAK (high)::.env file present but not covered by .gitignore
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  <div className="text-gray-400">
                    {"=== Cipher Wallet Audit — Summary ==="}
                  </div>
                  <div className="text-red-400">  critical: 4</div>
                  <div className="text-orange-400">      high: 1</div>
                  <div className="text-gray-500">    medium: 0</div>
                  <div className="text-gray-500">       low: 0</div>
                  <div className="text-white font-bold">     total: 5</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="text-emerald-400 text-[11px]">
                    → 4 critical findings need offline verification against 1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo
                  </div>
                </div>
              </div>
            </section>

            {/* Why this is better */}
            <section className="rounded-2xl border border-gray-700/40 bg-gray-800/30 p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Why Cipher Scanner &gt; Custom Bash Pipeline
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">5 rules already cover our patterns</strong> — JSON_KEYPAIR, PLAINTEXT_KEY, HEX_PRIVATE_KEY, SEED_IN_COMMENT, MNEMONIC_IN_STRING
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">Inline GitHub annotations</strong> — findings appear right on the PR diff, no log-digging
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">Zero runtime deps</strong> — Python 3.11 stdlib only, runs anywhere
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">MIT licensed</strong> — fork, adapt, extend freely
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">Severity levels built-in</strong> — fail CI on critical, warn on medium
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">Glob include/exclude</strong> — target specific dirs or skip noise
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">51 passing tests</strong> — well-tested pattern suite, not ad-hoc regex
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-300">Actively maintained</strong> — v1.4.0 (Apr 2026), Drift-hack rules added
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Fallback: global bash script */}
            <details className="rounded-2xl border border-gray-700/40 bg-gray-800/20 overflow-hidden group">
              <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Fallback: Global Bash Script (no deps, searches all public PRs)
              </summary>
              <div className="px-5 pb-4">
                <pre className="rounded-lg bg-gray-950 border border-gray-700/50 p-3 text-xs text-cyan-400 font-mono overflow-x-auto scrollbar-thin leading-relaxed">
{`# Global pipeline — searches ALL public GitHub PRs
# Stage 1: Find PRs globally with the comment phrase
# Stage 2: Scan each PR's diff for Solana key patterns

# Using GitHub's global search (not scoped to a repo)
gh search prs 'is:pr "This PR was created" in:comments' \\
  --json repository,number --limit 1000 |
jq -r '.[] | "\\(.repository.nameWithOwner) \\(.number)"' |
while read -r repo pr; do
  echo "=== Scanning $repo PR #$pr ==="
  gh pr diff "$pr" --repo "$repo" |
    grep -nE '(\\[[[:space:]]*[0-9]{1,3}([[:space:]]*,[[:space:]]*[0-9]{1,3}){63}[[:space:]]*\\]|[1-9A-HJ-NP-Za-km-z]{87,88})'
done`}
                </pre>
                <div className="mt-3 space-y-2 text-[11px] text-gray-500">
                  <p>
                    <strong className="text-gray-400">Note:</strong> This only catches 2 patterns. The Cipher scanner catches 5 relevant patterns
                    plus handles severity, annotations, and CI integration.
                  </p>
                  <p>
                    <strong className="text-yellow-400">⚠ Limits:</strong> GitHub caps search at 1,000 results. Rate limits apply (5,000 requests/hour authenticated).
                    A truly exhaustive scan of all public PRs may require pagination or multiple queries.
                  </p>
                </div>
              </div>
            </details>
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
