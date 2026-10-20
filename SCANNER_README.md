# Puzzle #140 — Global GitHub PR Scanner

A production-ready tool for scanning all public GitHub pull requests for Solana key patterns and potential Bitcoin puzzle clues.

## 🎯 Purpose

This scanner searches **all public GitHub PRs** (not scoped to a single repository) for:
- **64-byte numeric arrays** (Solana keypair JSON format)
- **Base58-encoded private keys** (87-88 characters)
- **Base58 public keys/addresses** (32-44 characters)

Designed for Puzzle #140 hunting and Solana wallet security auditing.

## 📊 What It Does

1. **Stage 1: Global PR Discovery**
   - Searches GitHub for all PRs containing `"This PR was created"`
   - Uses datetime bisection to handle 130k+ PRs
   - Stores results in SQLite database with resume capability

2. **Stage 2: Diff Scanning**
   - Fetches each PR's diff (code changes)
   - Scans for three pattern types
   - Records hits with context for analysis

## ⚡ Quick Start

```bash
# 1. Set your GitHub token (CRITICAL for rate limits)
export GITHUB_TOKEN="ghp_your_token_here"

# 2. Run the scanner
python3 pr-solana-scan.py

# 3. Check results
sqlite3 scan.db "SELECT kind, COUNT(*) FROM hits GROUP BY kind"
```

## 🔧 Requirements

- **Python 3.11+** (no external dependencies)
- **GitHub Personal Access Token** (see below)
- **~50-100 MB disk space** for `scan.db`
- **~27 hours runtime** (55 min enumeration + 26 hours diff scanning)
- **Stable internet connection** (resume capability built-in)

## 🎫 GitHub Token Setup

**Why you need it:**
- Without token: 60 requests/hour → **90 days** for 130k diffs
- With token: 5,000 requests/hour → **~26 hours**

**How to get it:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it "PR Scanner"
4. Select scope: `repo` (for private repos) or no scope (public only)
5. Copy the token and set it:
   ```bash
   export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
   ```

## 📈 Expected Results

Based on mock analysis of 130,653 PRs:

| Pattern | Count | Percentage | Signal Quality |
|---------|-------|------------|----------------|
| b58pub (addresses) | 612 | 72.3% | ⭐ Low (mostly noise) |
| json64 (64-byte arrays) | 189 | 22.3% | ⭐⭐ Medium (needs review) |
| b58secret (private keys) | 46 | 5.4% | ⭐⭐⭐ High (verify these) |

**Total hits:** 847 out of 130,653 PRs (0.65% hit rate)

## 🎛️ Configuration

Edit the script to customize:

```python
# Time window (default: last 30 days)
START = datetime(2026, 9, 20, tzinfo=timezone.utc)
END   = datetime(2026, 10, 20, 23, 59, 59, tzinfo=timezone.utc)

# Parallelism (default: 24 workers)
WORKERS = 24

# Search phrase (default: 'is:pr "This PR was created"')
PHRASE = 'is:pr "This PR was created"'
```

## 📊 Viewing Results

### Query the database directly:
```bash
# Total hits by pattern
sqlite3 scan.db "SELECT kind, COUNT(*) FROM hits GROUP BY kind ORDER BY 2 DESC"

# View sample hits
sqlite3 scan.db "SELECT repo, num, kind, line FROM hits LIMIT 10"

# Export to JSON
sqlite3 -json scan.db "SELECT * FROM hits" > hits.json
```

### Use the dashboard:
1. Copy `scan.db` to `public/results.json` (format conversion needed)
2. Open the dashboard in your browser
3. Navigate to "GH Scanner" tab
4. View "Live Results" section

## 🔄 Resume Capability

If the scan is interrupted:
```bash
# Just run it again - it will resume from where it left off
python3 pr-solana-scan.py
```

The script checks `scan.db` for `scanned=0` and continues from there.

## 🎯 For Puzzle #140 Hunting

**Current limitation:** This scanner uses Solana-focused patterns. For Bitcoin Puzzle #140, you need to add:

```python
# Add to PATTERNS list:
("btc_wif", re.compile(r'[5KL][1-9A-HJ-NP-Za-km-z]{50,51}')),  # Bitcoin WIF
("btc_addr", re.compile(r'[13][a-km-zA-HJ-NP-Z1-9]{25,34}')),   # Bitcoin address
("btc_hex", re.compile(r'(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])')),  # 256-bit hex
```

**Target address:** `1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo`

## ⚠️ Important Notes

1. **Rate limits:** GitHub API has strict rate limits. Always use a token.
2. **Runtime:** 27 hours is a long time. Run overnight or on a server.
3. **False positives:** Many hits are test vectors, mock data, or legitimate keys.
4. **Verification required:** Every hit needs manual verification against target address.
5. **Legal/ethical:** Only scan public repositories. Respect GitHub's ToS.

## 🐛 Troubleshooting

### "GITHUB_TOKEN not set"
```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### "Rate limit exceeded"
- You're not using a token, or it's invalid
- Check: `curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit`

### "Database is locked"
- Another instance is running
- Wait for it to finish or delete `scan.db` and start over

### Scan is too slow
- Increase `WORKERS` (default: 24, try 32 or 48)
- Ensure you have a fast internet connection
- Check GitHub API status: https://www.githubstatus.com/

## 📚 Related

- [Dashboard](./DASHBOARD_UPDATES.md) - Visual interface for results
- [Scan Results](./SCAN_RESULTS.md) - Mock analysis and findings
- [Cipher Scanner](https://github.com/cryptomotifs/cipher-solana-wallet-audit) - Alternative tool with GitHub Action integration

## 📄 License

MIT - Use at your own risk. No warranty expressed or implied.

## 🤝 Contributing

Found a bug? Want to add Bitcoin patterns? Open an issue or PR.

---

**Version:** 1.0 (Production-Ready)  
**Last Updated:** October 20, 2026  
**Author:** Puzzle #140 Hunt Team
