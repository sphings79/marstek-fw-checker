# Deployment Guide — Marstek Firmware Downloader

Everything needed to run the tool: a full **from-scratch install** on a new
server, how to **update** an existing deploy, and how/where to set the
**GitHub token**.

---

## 1. What it is / how it runs

- A **React + Vite** single-page app, built to static files in `dist/`.
- A small **Node/Express** backend (`marstek-server.cjs`) that:
  - serves the built `dist/` SPA, and
  - proxies the Marstek cloud API (CORS) + the GitHub firmware-archive calls.
- Runs as a **systemd service** on `127.0.0.1:3000`, behind **Apache** (KeyHelp)
  at `https://sphings-dev.de/marstek/marstek-fw-checker/`.

```
Browser ──HTTPS──> Apache (reverse proxy) ──> Node/Express :3000 ──> dist/ + API proxy
```

**Concrete values used below** (adapt for another server):

| Thing | Value |
|---|---|
| OS user | `sphings-dev` |
| App directory | `/home/users/sphings-dev/marstek-fw-checker` |
| Domain / base path | `https://sphings-dev.de/marstek/marstek-fw-checker/` |
| Port | `3000` |
| systemd unit | `marstek-fw-checker` |

---

## 2. Prerequisites

- **Node.js ≥ 20.19** (Vite 7 requires it) and npm — installed system-wide so
  `/usr/bin/node` exists for systemd.
- **git**
- **Apache** with `proxy` + `proxy_http` modules (KeyHelp panel for the vhost).

Install Node 22 + git on Debian/Ubuntu (NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs git
```

Check:

```bash
node -v   # must be >= 20.19
```

---

## 3. GitHub token (for the archive-donation + diagnostics features)

The backend uses one token (env var `GITHUB_TOKEN`) for two things:

- **Archive donation** — creates an issue in the public repo
  `sphings79/marstek-firmware-archiv` and reads it to show archive status.
- **"Submit RAW data" diagnostics** — creates an issue in the **private** repo
  `sphings79/marstek-fw-diagnostics`.

**Without the token the tool still works** — only the donate/diagnostics buttons
are inactive (login, version checking and downloads keep working).

### Which token + which rights

Create a **fine-grained** personal access token:

1. GitHub → your avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Token name:** e.g. `marstek-fw-checker-server`.
3. **Resource owner:** `sphings79`.
4. **Expiration:** **No expiration** is fine for a set-and-forget server token
   (otherwise the features break when it lapses). If it ever leaks, revoke it
   manually.
5. **Repository access:** *Only select repositories* → select **both**:
   - `marstek-firmware-archiv` (public archive)
   - `marstek-fw-diagnostics` (private diagnostics)
6. **Permissions** (apply to both repos):
   - **Issues** → **Read and write**
   - **Contents** → **Read-only**
   - *(Metadata → Read-only is added automatically.)*
7. **Generate token** and **copy it now** (shown only once) — `github_pat_…`.

> A classic token with the `repo` scope also works and never expires, but grants
> access to all your repos; the fine-grained token above is least-privilege.

### Where to set it (first time)

The systemd service reads `GITHUB_TOKEN` from the environment. **Pick one:**

**Option A — separate env file (recommended):**

```bash
echo 'GITHUB_TOKEN=PASTE_YOUR_TOKEN_HERE' | sudo tee /etc/marstek-fw-checker.env >/dev/null && sudo chmod 600 /etc/marstek-fw-checker.env
```

Reference it in the unit with `EnvironmentFile=/etc/marstek-fw-checker.env`
(see the unit file in §4).

**Option B — inline in the unit file:** add a line
`Environment=GITHUB_TOKEN=PASTE_YOUR_TOKEN_HERE` to the `[Service]` section.

> The token is **never** committed to git and never reaches the browser — it
> lives only on the server.

### Updating / rotating the token

If you create a **new** token (e.g. switching from a classic to a fine-grained
one, or after a leak), replace the value where it's currently set. First find
where that is:

```bash
grep -n GITHUB_TOKEN /etc/systemd/system/marstek-fw-checker.service; sudo systemctl show marstek-fw-checker -p EnvironmentFiles
```

- **Inline in the unit** (a `Environment=GITHUB_TOKEN=…` line was printed):
  ```bash
  sudo nano /etc/systemd/system/marstek-fw-checker.service   # replace the value
  sudo systemctl daemon-reload && sudo systemctl restart marstek-fw-checker
  ```
- **From an env file** (`EnvironmentFiles=…/marstek-fw-checker.env` was printed):
  ```bash
  sudo nano /etc/marstek-fw-checker.env                      # replace the value
  sudo systemctl restart marstek-fw-checker
  ```

Verify:

```bash
journalctl -u marstek-fw-checker -n 15 --no-pager | grep GITHUB_TOKEN
```

Expected: `GITHUB_TOKEN: ✅ gesetzt`.

> If you keep the **same** fine-grained token and only add the diagnostics repo
> to its repository access, the token value doesn't change — nothing to update
> on the server, just make sure the service has been restarted since.

---

## 4. Fresh install from scratch

Run over SSH. Assumes §2 (Node/git) is done.

### 4.1 Clone + build

```bash
sudo git clone https://github.com/sphings79/marstek-fw-checker.git /home/users/sphings-dev/marstek-fw-checker && cd /home/users/sphings-dev/marstek-fw-checker && sudo npm install && sudo npm run build && sudo chown -R sphings-dev:sphings-dev /home/users/sphings-dev/marstek-fw-checker
```

### 4.2 Set the GitHub token

Do §3 now (Option A or B).

### 4.3 Create the systemd service

```bash
sudo nano /etc/systemd/system/marstek-fw-checker.service
```

Paste (this uses **Option A**, the env file; for Option B delete the
`EnvironmentFile` line and add `Environment=GITHUB_TOKEN=...` instead):

```ini
[Unit]
Description=Marstek Firmware Downloader
After=network.target

[Service]
Type=simple
User=sphings-dev
Group=sphings-dev
WorkingDirectory=/home/users/sphings-dev/marstek-fw-checker
ExecStart=/usr/bin/node marstek-server.cjs
Restart=on-failure
RestartSec=10
Environment=PORT=3000
EnvironmentFile=/etc/marstek-fw-checker.env

[Install]
WantedBy=multi-user.target
```

Enable + start:

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now marstek-fw-checker && sudo systemctl status marstek-fw-checker --no-pager
```

### 4.4 Configure Apache (KeyHelp)

Enable the proxy modules:

```bash
sudo a2enmod proxy proxy_http && sudo systemctl reload apache2
```

In the KeyHelp panel → **Domains** → `sphings-dev.de` → **Custom Apache
directives**, add:

```apache
# App (SPA) — Apache strips the prefix, Node serves dist/ at the root
ProxyPass        /marstek/marstek-fw-checker/ http://127.0.0.1:3000/
ProxyPassReverse /marstek/marstek-fw-checker/ http://127.0.0.1:3000/

# API calls (the frontend calls these at the domain root)
ProxyPass        /.netlify/functions/ http://127.0.0.1:3000/.netlify/functions/
ProxyPassReverse /.netlify/functions/ http://127.0.0.1:3000/.netlify/functions/
```

Save (KeyHelp reloads Apache), or manually:

```bash
sudo systemctl reload apache2
```

### 4.5 Verify

```bash
curl -s http://127.0.0.1:3000/ | grep -o '<title>[^<]*</title>'
```

Expected: `<title>Marstek Firmware Downloader</title>`. Then open
`https://sphings-dev.de/marstek/marstek-fw-checker/` and hard-reload (Ctrl+F5).
Check the token was picked up:

```bash
journalctl -u marstek-fw-checker -n 15 --no-pager | grep GITHUB_TOKEN
```

Expected: `GITHUB_TOKEN: ✅ gesetzt`.

---

## 5. Updating an existing deploy

First confirm the service runs the `.cjs` entry (older installs used
`marstek-server.js`):

```bash
grep ExecStart /etc/systemd/system/marstek-fw-checker.service
```

- If it shows `marstek-server.cjs` → just pull, build, restart:

  ```bash
  cd /home/users/sphings-dev/marstek-fw-checker && sudo ./deploy.sh
  ```

  (`deploy.sh` = `git pull` + `npm install` + `npm run build` + restart.)

- If it still shows `marstek-server.js` (upgrading from the old vanilla version),
  switch it once:

  ```bash
  sudo sed -i 's#marstek-server\.js#marstek-server.cjs#' /etc/systemd/system/marstek-fw-checker.service && sudo systemctl daemon-reload
  ```

  then run the `deploy.sh` line above.

> Note: `raw.githubusercontent.com` caches ~5 min, but `git pull` is not affected —
> it always fetches the true latest commit.

---

## 6. Rollback

To the previous vanilla version (if a backup dir was kept during migration):

```bash
sudo systemctl stop marstek-fw-checker && cd /home/users/sphings-dev && sudo rm -rf marstek-fw-checker && sudo mv marstek-fw-checker-vanilla-backup marstek-fw-checker && sudo sed -i 's#marstek-server\.cjs#marstek-server.js#' /etc/systemd/system/marstek-fw-checker.service && sudo systemctl daemon-reload && sudo systemctl start marstek-fw-checker
```

The vanilla version also lives on the **`legacy-vanilla`** branch and the
**`v1-vanilla`** tag. To roll the git checkout back to a specific version:

```bash
cd /home/users/sphings-dev/marstek-fw-checker && sudo git checkout v1-vanilla && sudo npm install && sudo npm run build && sudo systemctl restart marstek-fw-checker
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm run build` fails, mentions Node/engine | Node < 20.19 — install Node ≥ 22 (§2). |
| Page loads but assets 404 / blank | Apache proxy for `/marstek/marstek-fw-checker/` missing or not reloaded (§4.4). |
| Login / device list fails | `/.netlify/functions/` proxy rule missing (§4.4), or service not running. |
| Donation buttons do nothing / "failed" | `GITHUB_TOKEN` not set or lacks Issues:write on the archive repo (§3). |
| Browser shows old version after update | Hard-reload (Ctrl+F5) — browser cache. |
| Check logs | `journalctl -u marstek-fw-checker -f` |
