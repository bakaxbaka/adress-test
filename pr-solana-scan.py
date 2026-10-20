#!/usr/bin/env python3
"""
Puzzle #140 — Global GitHub PR Scanner
Scans all public PRs for Solana key patterns (and Bitcoin puzzle clues)

Usage:
    export GITHUB_TOKEN="ghp_your_token_here"
    python3 pr-solana-scan.py

Requirements:
    - Python 3.11+
    - GitHub token (critical for rate limits)
    - ~50-100 MB disk space for scan.db
    - ~27 hours runtime (55 min enum + 26 hours diff scan)
"""

import os, re, json, time, sqlite3, sys, threading
from datetime import datetime, timezone, timedelta
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- Config ---
TOKEN  = os.environ.get("GITHUB_TOKEN", "")
PHRASE = 'is:pr "This PR was created"'          # No in:comments
CAP    = 1000
WORKERS = 24
RATE_S = 2.1        # Authenticated search = 30 req/min
DB_FILE = "scan.db"

# Window: Last 30 days (adjust as needed)
START = datetime(2026, 9, 20, tzinfo=timezone.utc)
END   = datetime(2026, 10, 20, 23, 59, 59, tzinfo=timezone.utc)

if not TOKEN:
    print("⚠ WARNING: GITHUB_TOKEN not set. Diff fetches will hit 60/hour rate limit (90 days).", file=sys.stderr)
    print("  Set GITHUB_TOKEN for 5,000/hour rate limit (~26 hours).", file=sys.stderr)
    response = input("Continue without token? (y/N): ")
    if response.lower() != 'y':
        sys.exit(1)

HDRS = {"Accept": "application/vnd.github+json", "User-Agent": "pr-solana-scan"}
if TOKEN:
    HDRS["Authorization"] = f"Bearer {TOKEN}"

# --- DB Setup (Thread-Safe) ---
db_lock = threading.Lock()
db = sqlite3.connect(DB_FILE, check_same_thread=False)
db.executescript("""
  CREATE TABLE IF NOT EXISTS prs(
    repo TEXT, 
    num INT, 
    url TEXT, 
    scanned INT DEFAULT 0,
    PRIMARY KEY(repo, num)
  );
  CREATE TABLE IF NOT EXISTS hits(
    repo TEXT, 
    num INT, 
    url TEXT, 
    kind TEXT, 
    line TEXT, 
    PRIMARY KEY(repo, num, kind, line)
  );
  CREATE INDEX IF NOT EXISTS idx_prs_scanned ON prs(scanned);
""")

def iso(dt): 
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def _get(url):
    """Rate-limited HTTP GET with retry."""
    for attempt in range(6):
        try:
            with urlopen(Request(url, headers=HDRS), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 5: raise
            wait = 2 ** attempt
            print(f"  Retry {attempt+1} for {url.split('?')[0]}: {e}", file=sys.stderr)
            time.sleep(wait)

def search_count(q):
    n = _get("https://api.github.com/search/issues?" + urlencode({"q": q, "per_page": 1}))["total_count"]
    time.sleep(RATE_S)
    return n

def harvest(q):
    """Paginate through search results and insert into DB."""
    page, got = 1, 0
    while True:
        d = _get("https://api.github.com/search/issues?" +
                 urlencode({"q": q, "per_page": 100, "page": page}))
        items = d.get("items", [])
        if not items: break
        
        # Prepare batch
        rows = []
        for i in items:
            repo = i["repository_url"].split("/repos/")[-1]
            num = i["number"]
            url = i["pull_request"]["diff_url"]
            if url:
                rows.append((repo, num, url))
        
        with db_lock:
            db.executemany("INSERT OR IGNORE INTO prs(repo,num,url) VALUES(?,?,?)", rows)
            db.commit()
        
        got += len(items)
        if len(items) < 100: break
        page += 1
        time.sleep(RATE_S)
    return got

def enum(lo, hi, depth=0):
    """Bisect datetime window until leaf fits under CAP."""
    if lo >= hi: return 0
    q = f"{PHRASE} created:{iso(lo)}..{iso(hi)}"
    n = search_count(q)
    
    if n == 0:
        return 0
    
    # Leaf condition: small enough or atomic time unit
    if n <= CAP or (hi - lo) <= timedelta(seconds=2):
        print(f"  [Leaf] {iso(lo)} .. {iso(hi)} ({n} results)", flush=True)
        return harvest(q)
    
    # Bisect
    mid = lo + (hi - lo) / 2
    # Ensure mid is strictly between lo and hi
    if mid <= lo or mid >= hi:
        return harvest(q) # Fallback: treat as leaf if bisection fails
    
    print(f"  [Split] {iso(lo)} .. {iso(hi)} ({n} results) -> depth {depth}", flush=True)
    return enum(lo, mid, depth+1) + enum(mid + timedelta(seconds=1), hi, depth+1)

# --- Patterns ---
B   = r"(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)"
B58 = r"[1-9A-HJ-NP-Za-km-z]"
PATTERNS = [
    ("json64",    re.compile(rf"\[[ \t]*{B}(?:[ \t]*,[ \t]*{B}){{63}}[ \t]*\]")),
    ("b58secret", re.compile(rf"(?<!{B58}){B58}{{87,88}}(?!{B58})")),
    ("b58pub",    re.compile(rf"(?<!{B58}){B58}{{43,44}}(?!{B58})")),
]

def scan_one(row):
    repo, num, url = row
    # CRITICAL: Add token to diff fetch to avoid unauthenticated rate limit
    diff_headers = {"User-Agent": "pr-solana-scan"}
    if TOKEN:
        diff_headers["Authorization"] = f"Bearer {TOKEN}"
    
    try:
        with urlopen(Request(url, headers=diff_headers), timeout=45) as r:
            diff = r.read().decode("utf-8", "replace")
    except Exception as e:
        print(f"  ! {repo}#{num}: {e}", file=sys.stderr, flush=True)
        return

    hits = []
    for kind, pat in PATTERNS:
        for m in pat.finditer(diff):
            start = max(0, m.start() - 80)
            end = min(len(diff), m.end() + 40)
            line = diff[start:end].replace("\n", " ")
            hits.append((repo, num, f"https://github.com/{repo}/pull/{num}", kind, line[:300]))

    with db_lock:
        if hits:
            db.executemany("INSERT OR IGNORE INTO hits VALUES(?,?,?,?,?)", hits)
        db.execute("UPDATE prs SET scanned=1 WHERE repo=? AND num=?", (repo, num))
        db.commit()

if __name__ == "__main__":
    print("=" * 60)
    print("Puzzle #140 — Global GitHub PR Scanner")
    print("=" * 60)
    print(f"Window: {iso(START)} .. {iso(END)}")
    print(f"Workers: {WORKERS}")
    print(f"Token: {'YES' if TOKEN else 'NO (WARNING: 90 days runtime)'}")
    print("=" * 60)
    print()
    
    # 1. Enumerate if no data
    todo = db.execute("SELECT repo,num,url FROM prs WHERE scanned=0").fetchall()
    if not todo:
        print(f"[1/2] Enumerating PRs ...", flush=True)
        total = enum(START, END)
        print(f"Enumeration complete. Total PRs in DB: {total}", flush=True)
        todo = db.execute("SELECT repo,num,url FROM prs WHERE scanned=0").fetchall()
    else:
        print(f"[1/2] Resuming from previous scan. {len(todo)} PRs remaining.", flush=True)
    
    print(f"\n[2/2] Scanning {len(todo)} diffs ...", flush=True)
    
    if todo:
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futures = [ex.submit(scan_one, r) for r in todo]
            for i, _ in enumerate(as_completed(futures), 1):
                if i % 1000 == 0: 
                    print(f"  Progress: {i}/{len(todo)}", flush=True)
    
    # 2. Report
    print("\n" + "=" * 60)
    print("SCAN COMPLETE")
    print("=" * 60)
    
    print("\n--- Hits by kind ---")
    for kind, c in db.execute("SELECT kind, COUNT(*) FROM hits GROUP BY kind ORDER BY 2 DESC"):
        print(f"  {kind:10} {c}")
    
    # 3. Show sample hits
    print("\n--- Sample Hits (first 20) ---")
    for row in db.execute("SELECT repo, num, kind, line FROM hits LIMIT 20"):
        print(f"  {row[0]}#{row[1]} [{row[2]}]: {row[3][:100]}...")
    
    # 4. Export to JSON for dashboard
    print("\n--- Exporting results to results.json ---")
    results = {
        "scan_date": datetime.now(timezone.utc).isoformat(),
        "total_prs": db.execute("SELECT COUNT(*) FROM prs").fetchone()[0],
        "scanned_prs": db.execute("SELECT COUNT(*) FROM prs WHERE scanned=1").fetchone()[0],
        "total_hits": db.execute("SELECT COUNT(*) FROM hits").fetchone()[0],
        "hits_by_kind": {},
        "sample_hits": []
    }
    
    for kind, c in db.execute("SELECT kind, COUNT(*) FROM hits GROUP BY kind ORDER BY 2 DESC"):
        results["hits_by_kind"][kind] = c
    
    for row in db.execute("SELECT repo, num, url, kind, line FROM hits LIMIT 100"):
        results["sample_hits"].append({
            "repo": row[0],
            "num": row[1],
            "url": row[2],
            "kind": row[3],
            "context": row[4]
        })
    
    with open("results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"Exported {len(results['sample_hits'])} hits to results.json")
    print("\nDone! You can now view results in the dashboard.")
