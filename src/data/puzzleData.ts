export interface PuzzleAddress {
  number: number;
  address: string;
  rangeStart: string;
  rangeEnd: string;
  status: "unsolved" | "solved" | "funded" | "empty";
  balance?: string;
  solvedKey?: string;
  solvedDate?: string;
}

export const puzzle140 = {
  number: 140,
  address: "1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo",
  rangeStart: "0x80000000000000000000000000000000000",
  rangeEnd: "0xfffffffffffffffffffffffffffffffffff",
  rangeBits: "2¹³⁹ – 2¹⁴⁰−1",
  status: "unsolved" as const,
  pubkey: null as string | null, // Must be fetched from mempool.space
  fundingTxid: null as string | null,
  spendTxid: null as string | null,
};

export const sweepAddress = {
  address: "1PmAFZaBpokiMZ8TxhwMBW78s4Y1U9mEwK",
  label: "Sweep Target",
};

export const watchlist = [
  "1HVMum4dVUxUfUNjh3UjA5e2LnmAjb2o2g",
  "1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo",
  "1PmAFZaBpokiMZ8TxhwMBW78s4Y1U9mEwK",
];

export interface HuntSource {
  id: string;
  site: string;
  page: string;
  url: string;
  exposes: ("address" | "key" | "balance" | "label")[];
  updateSignal: string;
  fetchable: "HTML" | "JSON" | "API";
  status: "pending" | "scanning" | "done" | "error";
  lastChecked?: string;
  hits: number;
}

export const huntSources: HuntSource[] = [
  { id: "pk-puzzles", site: "privatekeys.pw", page: "/puzzles", url: "https://privatekeys.pw/puzzles", exposes: ["address", "key", "balance"], updateSignal: "page content hash", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "pk-brain", site: "privatekeys.pw", page: "/brainwallet", url: "https://privatekeys.pw/brainwallet", exposes: ["address", "key", "balance"], updateSignal: "page content hash", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "keys-lol", site: "keys.lol", page: "/bitcoin/...", url: "https://keys.lol", exposes: ["address", "key", "balance"], updateSignal: "inline balance render", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "secretscan", site: "secretscan.org", page: "/Bitcoin_puzzle", url: "https://secretscan.org/Bitcoin_puzzle", exposes: ["address", "key"], updateSignal: "/results page", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "btcpuzzle", site: "btcpuzzle.info", page: "/puzzle", url: "https://btcpuzzle.info/puzzle", exposes: ["address", "key", "balance"], updateSignal: "page content hash", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "pkfinder", site: "privatekeyfinder.io", page: "/bitcoin-puzzle", url: "https://privatekeyfinder.io/bitcoin-puzzle", exposes: ["address", "key"], updateSignal: "/random-keys/<n>", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "satoshipool", site: "satoshipool.org", page: "/puzzles/", url: "https://satoshipool.org/puzzles/", exposes: ["address", "balance"], updateSignal: "page hash", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "directory", site: "directory.io", page: "/...", url: "https://directory.io", exposes: ["address", "key", "balance"], updateSignal: "paginated", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "bitkeys", site: "bitkeys.work", page: "/", url: "https://bitkeys.work", exposes: ["address", "key"], updateSignal: "latest scanned", fetchable: "HTML", status: "pending", hits: 0 },
  { id: "allkeys", site: "allkeys.io", page: "/", url: "https://allkeys.io", exposes: ["address", "key", "balance"], updateSignal: "feed", fetchable: "HTML", status: "pending", hits: 0 },
];

export interface Lead {
  id: string;
  source: string;
  identifier: string;
  type: "address" | "pubkey" | "privkey" | "seed" | "range-hex";
  claim: string;
  confidence: "high" | "medium" | "low" | "unverified";
  verified: boolean;
  timestamp: string;
  url?: string;
}

export interface Phase {
  id: string;
  name: string;
  priority: "P0" | "P1" | "P2";
  status: "pending" | "active" | "done" | "blocked";
  tasks: { name: string; done: boolean }[];
  description: string;
}

export const huntPhases: Phase[] = [
  {
    id: "phase-0",
    name: "Inventory Identifiers",
    priority: "P0",
    status: "active",
    description: "Collect all identifiers: address, range, pubkey, txids, creator strings",
    tasks: [
      { name: "Fetch compressed pubkey from mempool.space (2019-05-31 spend)", done: false },
      { name: "Get funding txid for #140", done: false },
      { name: "Get 1000-sat spend txid", done: false },
      { name: "Find creator/clue strings", done: false },
    ],
  },
  {
    id: "phase-1",
    name: "Published Key Sweep",
    priority: "P0",
    status: "pending",
    description: "Search all engines for already-published #140 key",
    tasks: [
      { name: "Exact-address dork (Google/Bing/DDG/Yandex)", done: false },
      { name: "Range-hex dorks", done: false },
      { name: "Poll all key DBs for #140 entry", done: false },
      { name: "Search 'puzzle 140 solved 2026'", done: false },
    ],
  },
  {
    id: "phase-2",
    name: "Code & Dataset Indexes",
    priority: "P0",
    status: "pending",
    description: "GitHub, Gist, HF, Kaggle, npm, PyPI, Common Crawl, BigQuery",
    tasks: [
      { name: "GitHub code search", done: false },
      { name: "grep.app + searchcode + sourcegraph", done: false },
      { name: "Gist search", done: false },
      { name: "HuggingFace + Kaggle datasets", done: false },
      { name: "npm/PyPI packages", done: false },
      { name: "Common Crawl index", done: false },
    ],
  },
  {
    id: "phase-3",
    name: "Archives & Caches",
    priority: "P1",
    status: "pending",
    description: "Wayback CDX, archive.today, Google/Bing cache",
    tasks: [
      { name: "Wayback CDX for puzzle page", done: false },
      { name: "Wayback CDX for BitcoinTalk thread", done: false },
      { name: "archive.today snapshots", done: false },
      { name: "Check if key ever appeared then removed", done: false },
    ],
  },
  {
    id: "phase-4",
    name: "Forums & Social",
    priority: "P1",
    status: "pending",
    description: "BitcoinTalk, Reddit, StackExchange, Discord, Pastebin, Twitter/X",
    tasks: [
      { name: "BitcoinTalk 'The Bitcoin Puzzle' thread", done: false },
      { name: "Reddit (r/BitcoinPuzzlePython etc.)", done: false },
      { name: "Bitcoin StackExchange", done: false },
      { name: "Collision Protocol Discord/GitHub", done: false },
      { name: "Pastebin search", done: false },
    ],
  },
  {
    id: "phase-5",
    name: "Creator Reverse-Engineering",
    priority: "P1",
    status: "pending",
    description: "Find origin of 'deterministic wallet' quote, catalog attempts",
    tasks: [
      { name: "Find primary source of generator quote", done: false },
      { name: "Catalogue creator statements (Electrum? BIP32? seed?)", done: false },
      { name: "Collect published seed/passphrase attempts", done: false },
      { name: "Identify creator spending addresses → identity", done: false },
    ],
  },
  {
    id: "phase-6",
    name: "Offline Cross-Check",
    priority: "P0",
    status: "pending",
    description: "Grep local JSONs for #140 data",
    tasks: [
      { name: "Grep master_puzzle_database", done: false },
      { name: "Grep puzzle_160_detailed_database", done: false },
      { name: "Grep key_pattern_analysis", done: false },
      { name: "Grep golden_knowledge", done: false },
      { name: "Grep bitcoin_vulnerabilities.json", done: false },
    ],
  },
  {
    id: "phase-7",
    name: "Synthesis Loop",
    priority: "P0",
    status: "pending",
    description: "Maintain lead table, dedupe, BIP32 derivation tests",
    tasks: [
      { name: "Lead table maintenance", done: false },
      { name: "Aggressive deduplication", done: false },
      { name: "BIP32/Electrum offline derivation", done: false },
      { name: "Engine rotation + phrasing variation", done: false },
    ],
  },
];

export const sweepPhases: Phase[] = [
  {
    id: "sweep-A",
    name: "Source Inventory",
    priority: "P0",
    status: "active",
    description: "Catalogue all key-search sites with update signals",
    tasks: huntSources.map((s) => ({ name: `${s.site} ${s.page}`, done: false })),
  },
  {
    id: "sweep-B",
    name: "Endpoint & API Discovery",
    priority: "P0",
    status: "pending",
    description: "robots.txt, sitemap.xml, JSON endpoints, rate limits",
    tasks: [
      { name: "Fetch robots.txt + sitemap.xml per domain", done: false },
      { name: "Probe ?format=json, /api, /feed", done: false },
      { name: "Document rate limits / ToS", done: false },
      { name: "Record update cadence per page", done: false },
    ],
  },
  {
    id: "sweep-C",
    name: "Change Detection",
    priority: "P0",
    status: "pending",
    description: "Wayback CDX cadence + SHA-256 content diffing",
    tasks: [
      { name: "Wayback CDX per URL (cadence)", done: false },
      { name: "SHA-256 content hashing", done: false },
      { name: "Diff against previous run", done: false },
      { name: "sitemap.xml lastmod trigger", done: false },
    ],
  },
  {
    id: "sweep-D",
    name: "Extraction",
    priority: "P0",
    status: "pending",
    description: "Regex extract address/key/balance, normalize, persist to SQLite",
    tasks: [
      { name: "Regex extraction pipeline", done: false },
      { name: "Normalization (trim, lowercase hex)", done: false },
      { name: "SQLite persistence", done: false },
    ],
  },
  {
    id: "sweep-E",
    name: "Balance Verification",
    priority: "P0",
    status: "pending",
    description: "Dual-API verification (mempool.space + blockstream)",
    tasks: [
      { name: "mempool.space batch verify", done: false },
      { name: "blockstream.info cross-check", done: false },
      { name: "blockchair.com tertiary check", done: false },
    ],
  },
  {
    id: "sweep-F",
    name: "Cross-Reference",
    priority: "P0",
    status: "pending",
    description: "Match against 160 puzzle addresses + watchlist",
    tasks: [
      { name: "Match vs 160 puzzle addresses", done: false },
      { name: "Match vs watchlist", done: false },
      { name: "Funded-address snapshot intersection", done: false },
      { name: "Tag by scheme (decimal/pow2/hex/brainwallet)", done: false },
    ],
  },
  {
    id: "sweep-G",
    name: "Puzzle Address Monitor",
    priority: "P0",
    status: "pending",
    description: "Daily balance poll on all 160 puzzle addresses",
    tasks: [
      { name: "Load all 160 puzzle addresses", done: false },
      { name: "Daily balance poll", done: false },
      { name: "Alert on balance drop → swept", done: false },
      { name: "Alert on incoming tx → creator activity", done: false },
    ],
  },
  {
    id: "sweep-H",
    name: "Output & Ranking",
    priority: "P0",
    status: "pending",
    description: "Lead table, dedupe, rank by balance + novelty",
    tasks: [
      { name: "Single lead table output", done: false },
      { name: "Dedupe by address", done: false },
      { name: "Rank by balance + novelty", done: false },
    ],
  },
  {
    id: "sweep-I",
    name: "Automation",
    priority: "P0",
    status: "pending",
    description: "Cron/GitHub Action, SQLite state, backoff, UA rotation",
    tasks: [
      { name: "Cron / Task Scheduler setup", done: false },
      { name: "SQLite + page hash persistence", done: false },
      { name: "429/503 backoff logic", done: false },
      { name: "User-Agent rotation", done: false },
    ],
  },
];
