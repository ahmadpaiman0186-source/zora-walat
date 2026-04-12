# Stripe CLI on Windows (Zora-Walat operator notes)

**End-to-end local webhook flow** (listen → paste `whsec_` → restart API → trigger): [`STRIPE_LOCAL_WEBHOOK_FLOW.md`](./STRIPE_LOCAL_WEBHOOK_FLOW.md)

## Install location (durable)

- **Binary**: `C:\stripe\stripe.exe` (copy of the extracted CLI; avoid relying on `Downloads` long-term).
- **Source used when this was set up**: `C:\Users\ahmad\Downloads\stripe_1.40.2_windows_x86_64\stripe.exe` (v1.40.2).

## PATH

- **`C:\stripe` is prepended to the per-user PATH** (`HKCU\Environment`, `Path`), so a normal Windows login session merges:
  - machine `Path` (HKLM) **then**
  - user `Path` (HKCU), which begins with `C:\stripe;…`
- **System `Path` may still list** the old Downloads folder or other entries; that is optional to clean up (requires Administrator) for tidiness only.

## Also on this machine

- WinGet may provide **`…\WinGet\Links\stripe.exe`** (symlink). After a full PATH merge, `where.exe stripe` can list multiple paths; the **first** match wins.

## Verify (after changing PATH)

1. **Close and reopen** terminals — especially if the IDE was open when `Path` was edited.
2. If **`stripe` is still not recognized inside an IDE terminal**, the IDE may be using a **cached `PATH` from when it started**. Fully **quit and restart the IDE**, or open **Windows Terminal / PowerShell from the Start menu** and test there.
3. Commands:

```powershell
where.exe stripe
stripe --version
```

**Sanity check** (forces the same merge Windows uses for new processes):

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
where.exe stripe
stripe --version
```

## Webhooks (local API)

Forward to the API (adjust host/port if your server differs):

```powershell
stripe listen --forward-to http://127.0.0.1:8787/webhooks/stripe
```

If the CLI says you are not logged in:

```powershell
stripe login
```

The **`whsec_…`** signing secret is printed when `stripe listen` starts (each new session may differ). You can also run `stripe listen --print-secret` alongside your `--forward-to` URL. Paste the value into `server/.env` as `STRIPE_WEBHOOK_SECRET` and **restart** the API — see [`STRIPE_LOCAL_WEBHOOK_FLOW.md`](./STRIPE_LOCAL_WEBHOOK_FLOW.md).
