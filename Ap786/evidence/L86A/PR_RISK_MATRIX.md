# L-86A — PR risk matrix

**Scale:** LOW / MEDIUM / HIGH / UNKNOWN

---

## Per-PR risk

| PR | Governance | Accidental merge | Secret exposure | Runtime/deploy | Payment/provider | Proof-chain |
|----|------------|------------------|-----------------|----------------|------------------|-------------|
| **#5** | MEDIUM | **HIGH** | LOW | **HIGH** | **HIGH** | **HIGH** |
| **#6** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#7** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#8** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#9** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#10** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#11** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#12** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#13** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#14** | LOW | LOW | LOW | LOW | MEDIUM | **HIGH** |
| **#15** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#16** | LOW | LOW | LOW | LOW | LOW | **HIGH** |
| **#17** | LOW | LOW | LOW | LOW | LOW | **HIGH** |

## Top 5 highest-risk open PRs

| Rank | PR | Primary risk drivers |
|------|-----|---------------------|
| 1 | **#5** | Runtime + Stripe/webhook + likely conflict + stale checks + HIGH accidental merge |
| 2 | **#14** | Vendor/provider-themed docs; proof-chain drift vs Ap786 L-85 |
| 3 | **#8** | Security/compliance docs; unproven launch claims |
| 4 | **#15** | Pentest/compliance docs; unproven compliance claims |
| 5 | **#16** | Release governance docs; conflicts with Ap786 gate workflow |

## Global risk notes

- All **13** PRs have **stale or empty** CI check signals vs current `main`.
- **None** are safe to merge without rebuild + explicit new gate.
- L-85M **NO PASS** — merging legacy runtime PR #5 would not advance current proof chain.

---

*End.*
