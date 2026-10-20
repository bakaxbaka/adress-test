# Puzzle #140 Dashboard - Latest Updates

## Overview
The GitHub PR Scanner tab has been significantly enhanced with production-ready tooling, live API intelligence, and comprehensive operational guidance for scanning all public GitHub PRs.

---

## 🌐 Global Search Integration

### Live API Intelligence (Oct 20, 2026)
Added real-time composition breakdown verified against the GitHub API:

**Total PRs:** 130,653 (created:≥2026-09-20)
- **115,441 (88.4%)** — Qwen coding agent bot (real code scaffolds)
- **15,207 (11.6%)** — Automated update bots (lockfile sync)
- **5 (0.004%)** — Residue (human/unknown)

**Key Insight:** Qwen bot PRs are actual agent-authored code changes (not lockfile bumps) — exactly the kind that might commit a `deploy.ts` with a keypair.

**Residue Query:**
```
is:pr "This PR was created" -"qwen-chat coder" -automatically created:≥2026-09-20
```
Only 5 PRs — scan these by hand first.

---

## 🔧 Production-Ready Script (Option C)

### Critical Fixes Implemented

1. **Thread-Safe SQLite**
   - Added `threading.Lock()` for concurrent writes
   - Prevents database corruption with 24 parallel workers

2. **Robust Bisection**
   - Explicit `lo >= hi` check prevents infinite loops
   - Mid validation ensures proper window splitting
   - Fallback to leaf if bisection fails

3. **Resume Capability**
   - `prs` table is source of truth
   - Interrupted scans resume from `scanned=0`
   - No re-processing of completed PRs

4. **Token for Diff Fetches** ⚠️ CRITICAL
   - Without token: 60/hour rate limit = **90 days** for 130k diffs
   - With token: 5,000/hour = **~26 hours**
   - Added `Authorization` header to diff fetches

5. **Retry Logic**
   - Exponential backoff (2^attempt seconds)
   - 6 retries with graceful error handling

6. **Sample Output**
   - Prints first 10 hits for quick verification
   - Confirms patterns working before full scan

---

## ⏱️ Corrected Cost & Time Estimates

### Enumeration Phase
- **Count calls:** ~260
- **Result pages:** ~1,310
- **Total search requests:** ~1,570
- **Time (authenticated 30/min):** ~55 minutes
- **Time (unauthenticated 10/min):** ~2.5 hours ⚠️

### Diff Scan Phase (CORRECTED)
- **Total diffs:** 130,000
- **Workers:** 24
- **Rate limit (with token):** 5,000/hour
- **Rate limit (no token):** 60/hour
- **Time (with token):** ~26 hours
- **Time (no token):** ~90 days ⚠️

### Total Runtime
**~27 hours** (55 min enumeration + 26 hours diff scan)

---

## 📋 Pre-Flight Checklist

Added comprehensive checklist covering:

### Requirements
- ⚠️ **GitHub Token Required** — Set `GITHUB_TOKEN` env var
- ✓ **Python 3.11+** — Zero external dependencies (stdlib only)
- ✓ **Disk Space** — ~50-100 MB for `scan.db`
- ✓ **Stable Connection** — 26-hour run with resume capability
- ⏱️ **Time Commitment** — ~27 hours total
- 💡 **Calibration Run** — Optional: enumerate only, scan first 2k diffs

### Quick Start Commands
```bash
# 1. Set token
export GITHUB_TOKEN="ghp_your_token_here"

# 2. Run script (will resume if interrupted)
python3 pr-solana-scan.py

# 3. Check results
sqlite3 scan.db "SELECT kind, COUNT(*) FROM hits GROUP BY kind"
sqlite3 scan.db "SELECT repo, num, kind, line FROM hits LIMIT 10"
```

---

## 🔬 Sanity Check — Signal Calibration

**Test Result:** Pulled top result's diff (`sae-space-ai/geo-marte-3d#2`, qwen agent scaffold — 717 modules, full TS app)

**Result:** Zero Solana matches — React/Three.js app with sql.js backend, no wallet code.

**Expectation:** 
- `json64` hits will be genuinely rare
- `b58pub` hits will be dominated by noise

**Recommendation:** Before committing 27 hours, run enumeration only, then scan first 2,000 diffs and extrapolate the `json64` rate.

---

## 🛡️ Cipher Solana Wallet Audit Integration

### Rule Mapping Table
Mapped all 13 rules from `cipher-solana-wallet-audit` to Puzzle #140 relevance:

**★★★ Exact Matches (5 rules):**
- `JSON_KEYPAIR` — 64-integer arrays (same shape as Bitcoin privkey)
- `PLAINTEXT_KEY` — Base58 strings 86-90 chars (WIF keys)
- `HEX_PRIVATE_KEY` — 64/128-char hex assigned to private_key identifiers
- `SEED_IN_COMMENT` — 12/24-word BIP39 phrase in comments (chain-agnostic)
- `MNEMONIC_IN_STRING` — BIP39 phrase as string literal

**★★☆ Marginal (2 rules):**
- `ENV_LEAK` — .env file not covered by .gitignore
- `SOLANA_CONFIG_KEYPAIR` — Tracked id.json / *-keypair.json files

**Not Applicable (6 rules):**
- Solana-specific patterns (Drift hack, Token2022, Anchor, etc.)

### Three Integration Options

**Option A:** Run as GitHub Action on target PRs
```yaml
# .github/workflows/puzzle-scan.yml
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
          include: '**/*'
          exclude: 'node_modules/**,.git/**'
```

**Option B:** Fork & adapt `patterns.py` for Bitcoin-specific rules

**Option C:** Run locally against global PR diffs (production-ready script above)

---

## 📊 Visual Enhancements

### Composition Chart
Horizontal stacked bar showing:
- Blue (88.4%): Qwen bot
- Purple (11.6%): Auto-update bots
- Orange (0.004%): Residue (not visible at this scale)

### Stats Grid
Four stat cards showing:
- Total PRs: 130,653
- Qwen Bot: 115,441 (88.4%)
- Auto-Update Bots: 15,207 (11.6%)
- Residue: 5 (0.004%)

---

## 🎯 Key Takeaways

1. **Token is mandatory** — Without it, the scan takes 90 days instead of 26 hours
2. **Qwen PRs are the target** — 88% of matches are real code scaffolds that could contain keys
3. **Scan the 5 residue PRs first** — They're the most likely to be genuine human/bot-unknown
4. **Calibrate before committing** — Run enumeration + first 2k diffs to estimate hit rate
5. **Resume capability is critical** — 27-hour run will get interrupted; script handles this gracefully

---

## 📁 Files Modified

- `src/App.tsx` — Added global search integration, production script, cost estimates, checklist
- `index.html` — Updated title to "Puzzle #140 — Agentic Web-Index Hunt Dashboard"

---

## 🚀 Next Steps

1. **Get a GitHub token** with `repo` scope
2. **Run calibration:** Enumerate only, scan first 2k diffs
3. **Extrapolate hit rate:** If `json64` rate is too low, reconsider scope
4. **Full scan:** If calibration looks good, run full 27-hour scan
5. **Monitor hits:** Check `scan.db` periodically for findings
6. **Verify matches:** Cross-reference hits against target address `1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo`

---

## 🔗 External Resources

- **Cipher Solana Wallet Audit:** https://github.com/cryptomotifs/cipher-solana-wallet-audit
- **GitHub Marketplace:** https://github.com/marketplace/actions/cipher-solana-wallet-audit
- **GitHub Search API:** https://docs.github.com/en/rest/search/search
- **Rate Limits:** https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api
