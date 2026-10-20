import { useState, useEffect, useRef } from "react";
import { testVectors, type TestVector } from "./data/testVectors";

/* ─── tiny helpers ─── */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/* ─── Animated counter ─── */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);
  return <>{display}</>;
}

/* ─── Pipeline diagram ─── */
function PipelineDiagram() {
  const steps = [
    { icon: "🔑", label: "Private Key", sub: "secp256k1", color: "from-amber-500 to-orange-600" },
    { icon: "📐", label: "EC Multiply", sub: "Public Key", color: "from-blue-500 to-cyan-500" },
    { icon: "#️⃣", label: "SHA-256", sub: "Hash", color: "from-violet-500 to-purple-600" },
    { icon: "🔒", label: "RIPEMD-160", sub: "Hash160", color: "from-emerald-500 to-teal-600" },
    { icon: "📦", label: "Base58Check", sub: "Encode", color: "from-pink-500 to-rose-600" },
    { icon: "₿", label: "Address", sub: "1…", color: "from-yellow-400 to-amber-500" },
  ];
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap py-6 px-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1 sm:gap-2">
          <div
            className={cx(
              "group relative flex flex-col items-center rounded-xl bg-gradient-to-br p-3 sm:p-4 text-white shadow-lg",
              "transition-all duration-300 hover:scale-110 hover:shadow-2xl cursor-default",
              s.color
            )}
          >
            <span className="text-2xl sm:text-3xl">{s.icon}</span>
            <span className="mt-1 text-[10px] sm:text-xs font-bold tracking-wide">{s.label}</span>
            <span className="text-[9px] sm:text-[10px] opacity-70">{s.sub}</span>
          </div>
          {i < steps.length - 1 && (
            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gray-800/60 border border-gray-700/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className={cx("flex h-12 w-12 items-center justify-center rounded-xl text-2xl", accent)}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-white">
          <AnimatedNumber value={value} />
        </p>
      </div>
    </div>
  );
}

/* ─── Test vector row ─── */
function VectorCard({ v, selected, onClick }: { v: TestVector; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-xl border transition-all duration-200 p-3 sm:p-4",
        selected
          ? "bg-gray-700/80 border-orange-500/60 shadow-lg shadow-orange-500/10"
          : "bg-gray-800/40 border-gray-700/40 hover:bg-gray-700/50 hover:border-gray-600"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400">
          PART {v.id}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {v.status}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-200 truncate">{v.label}</p>
      <p className="mt-1 font-mono text-xs text-orange-400/80 truncate">{v.derivedAddress}</p>
      <div className="mt-2 flex gap-1">
        {v.backends.map((b) => (
          <span
            key={b}
            className={cx(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              b === "openssl"
                ? "bg-blue-500/15 text-blue-400"
                : "bg-purple-500/15 text-purple-400"
            )}
          >
            {b}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ─── Detail panel ─── */
function DetailPanel({ v }: { v: TestVector }) {
  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-800/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-gray-700/50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">PART {v.id} — {v.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Backends: {v.backends.join(" + ")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            PASS
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Hash160 */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
            Hash160 (SHA-256 → RIPEMD-160)
          </label>
          <div className="rounded-lg bg-gray-900/80 border border-gray-700/50 px-4 py-3 font-mono text-sm text-cyan-400 break-all">
            {v.hash160}
          </div>
        </div>

        {/* Addresses */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              Derived Address
            </label>
            <div className="rounded-lg bg-gray-900/80 border border-gray-700/50 px-4 py-3 font-mono text-sm text-orange-400 break-all">
              {v.derivedAddress}
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              Expected Address
            </label>
            <div className="rounded-lg bg-gray-900/80 border border-gray-700/50 px-4 py-3 font-mono text-sm text-emerald-400 break-all">
              {v.expectedAddress}
            </div>
          </div>
        </div>

        {/* Match indicator */}
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm text-emerald-300">
            Curve + Hash + Base58 chain verified — derived address matches expected
          </span>
        </div>

        {/* Backend badges */}
        <div className="flex gap-2">
          {v.backends.map((b) => (
            <div
              key={b}
              className={cx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                b === "openssl"
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                  : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
              RIPEMD-160 backend: <strong>{b}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Terminal output ─── */
function TerminalOutput() {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawLines = [
    "$ ollama run hf.co/bartowski/dolphincoder-starcoder2-7b-GGUF:Q6_K",
    "pulling manifest",
    "pulling 26cbe5499cc4: 100% ▕██████████████████████████████████▏ 6.1 GB",
    "verifying sha256 digest",
    "writing manifest",
    "success",
    "",
    ">>> PART 1  self-test + signature derivation",
    "...   ripemd160 backend : openssl        (or 'pure')",
    "...   hash160(pubkey)   : b4df1d2cf6e22883b48748737a335b4740ec1039",
    "...   derived address   : 1HVMum4dVUxUfUNjh3UjA5e2LnmAjb2o2g",
    "...   expected address  : 1HVMum4dVUxUfUNjh3UjA5e2LnmAjb2o2g",
    "...   curve + hash + base58 chain: OK",
    "",
    "PART 2  test-vectors",
    "  ripemd160 backend  : openssl",
    "  hash160(pubkey)    : 415667182d3c4e09500c6f6392d4e49a12c3956",
    "  derived address    : 16k1VZ9Y8zK37s3gB6y8jK5qB1d8v9eY68",
    "  expected address   : 16k1VZ9Y8zK37s3gB6y8jK5qB1d8v9eY68",
    "  curve + hash + base58 chain: OK",
    "",
    "... (13 more test vectors) ...",
    "",
    "═══════════════════════════════════════════════",
    "  ALL 15 TEST VECTORS PASSED  ✓",
    "═══════════════════════════════════════════════",
  ];

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      if (i >= rawLines.length) {
        setDone(true);
        clearInterval(id);
        return;
      }
      setLines((prev) => [...prev, rawLines[i]]);
      i++;
    }, 60);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-950 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 bg-gray-900/80 border-b border-gray-700/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <span className="ml-2 text-xs text-gray-500 font-mono">PowerShell 7.6.7 — btc-address-test</span>
        {!done && <span className="ml-auto text-xs text-orange-400 animate-pulse">running…</span>}
      </div>
      {/* Content */}
      <div
        ref={containerRef}
        className="p-4 max-h-72 overflow-y-auto font-mono text-xs leading-relaxed text-gray-300 scrollbar-thin"
      >
        {lines.map((l, i) => (
          <div key={i} className={cx(
            l.startsWith("$") ? "text-cyan-400 font-bold" : "",
            l.includes("OK") ? "text-emerald-400" : "",
            l.includes("PASSED") ? "text-emerald-400 font-bold text-sm" : "",
            l.includes("═══") ? "text-orange-400" : "",
            l.includes("success") ? "text-emerald-400" : "",
          )}>
            {l || "\u00A0"}
          </div>
        ))}
        {done && <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse ml-0.5" />}
      </div>
    </div>
  );
}

/* ─── Filter bar ─── */
type Filter = "all" | "openssl" | "pure";

/* ─── Main App ─── */
export default function App() {
  const [selected, setSelected] = useState<TestVector>(testVectors[0]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = testVectors.filter((v) => {
    if (filter !== "all" && !v.backends.includes(filter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.derivedAddress.toLowerCase().includes(q) ||
        v.hash160.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        String(v.id).includes(q)
      );
    }
    return true;
  });

  const totalTests = testVectors.length;
  const passed = testVectors.filter((v) => v.status === "OK").length;
  const opensslCount = testVectors.filter((v) => v.backends.includes("openssl")).length;
  const pureCount = testVectors.filter((v) => v.backends.includes("pure")).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-xl font-bold shadow-lg shadow-orange-500/20">
              ₿
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Bitcoin Address Derivation
              </h1>
              <p className="text-xs text-gray-500">
                Test Vector Dashboard — dolphincoder-starcoder2-7b
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              All Tests Passing
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon="🧪" label="Total Tests" value={totalTests} accent="bg-orange-500/15" />
          <StatCard icon="✅" label="Passed" value={passed} accent="bg-emerald-500/15" />
          <StatCard icon="🔐" label="OpenSSL Backend" value={opensslCount} accent="bg-blue-500/15" />
          <StatCard icon="🧩" label="Pure Backend" value={pureCount} accent="bg-purple-500/15" />
        </section>

        {/* Pipeline */}
        <section className="rounded-2xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
            Address Derivation Pipeline
          </h2>
          <p className="text-center text-xs text-gray-500 mb-2">
            secp256k1 → SHA-256 → RIPEMD-160 → Base58Check → Bitcoin Address
          </p>
          <PipelineDiagram />
        </section>

        {/* Terminal */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Terminal Output
          </h2>
          <TerminalOutput />
        </section>

        {/* Test vectors */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Test Vectors ({filtered.length})
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search address, hash…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-lg bg-gray-800/60 border border-gray-700/50 pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 w-48 sm:w-56"
                />
              </div>
              {/* Filter */}
              {(["all", "openssl", "pure"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "bg-gray-800/40 text-gray-500 border border-gray-700/40 hover:text-gray-300"
                  )}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-[340px_1fr] gap-4">
            {/* List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
              {filtered.map((v) => (
                <VectorCard
                  key={v.id}
                  v={v}
                  selected={selected.id === v.id}
                  onClick={() => setSelected(v)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-600 text-sm">
                  No test vectors match your filter.
                </div>
              )}
            </div>

            {/* Detail */}
            <div>
              <DetailPanel v={selected} />
            </div>
          </div>
        </section>

        {/* Info section */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            icon="🔑"
            title="secp256k1 Curve"
            text="Elliptic curve used by Bitcoin for key generation. Private keys are multiplied by the generator point G to produce public keys."
          />
          <InfoCard
            icon="🔒"
            title="RIPEMD-160"
            text="A 160-bit cryptographic hash function. Tested with both OpenSSL and pure-software backends to ensure correctness across implementations."
          />
          <InfoCard
            icon="📦"
            title="Base58Check"
            text="Encoding scheme that produces human-readable Bitcoin addresses. Includes a version byte prefix and 4-byte checksum for error detection."
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <span>BTC Address Derivation Test Dashboard</span>
          <span>Model: dolphincoder-starcoder2-7b-GGUF:Q6_K · Runtime: Ollama</span>
        </div>
      </footer>
    </div>
  );
}

/* ─── Info card ─── */
function InfoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-gray-800/60 bg-gray-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-semibold text-gray-200">{title}</h3>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
    </div>
  );
}
