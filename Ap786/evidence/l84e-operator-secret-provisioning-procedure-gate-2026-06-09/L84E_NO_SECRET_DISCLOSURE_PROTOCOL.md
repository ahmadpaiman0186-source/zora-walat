# L-84E — No secret disclosure protocol

Applies to L-84E gate and all future secret provisioning evidence.

## Never record

| Class | Examples |
|-------|----------|
| Ops tokens | `OPS_HEALTH_TOKEN`, `ZW_OPS_HEALTH_TOKEN`, Bearer values |
| Token material | Hex/base64 strings, partial leaks, length+charset hints |
| UI captures | Screenshots showing Vercel value column |
| Chat/logs | Pasted token in operator transcripts filed in Ap786 |

## Never do

- Print token in terminal output saved to evidence
- Paste token into repo, PR body, or commit messages
- Search codebase/env dumps for token to file as proof
- Screenshot token value in Vercel UI

## Allowed records

| Item | Format |
|------|--------|
| Staging `OPS_HEALTH_TOKEN` | **PRESENT** or **NOT PRESENT** |
| Local `ZW_OPS_HEALTH_TOKEN` | **SET (value hidden)** or **NOT SET** |
| Value | **REDACTED / NOT RECORDED** |

## Validation before future commit

- `npm --prefix server run secrets:scan`
- `git diff --check`
- Manual review: no high-entropy strings in Ap786 diff

## L-84E gate

**No secrets provisioned or disclosed in this filing.**

---

*End.*
