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

## 3. GitHub token (for the archive-donation feature)

The backend creates a GitHub issue in `sphings79/marstek-firmware-archiv` when a
user donates firmware, and reads that repo to show archive status. This needs a
token. **Without it the tool still works** — only "Download & donate" / "Donate
only" are inactive (download and version checking keep working).

### Create the token

1. GitHub → your avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Resource owner:** `sphings79`.
3. **Repository access:** *Only select repositories* → **`marstek-firmware-archiv`**
   **and `marstek-fw-diagnostics`** (the private repo the "Submit RAW data"
   diagnostics button posts to).
4. **Permissions:**
   - **Issues** → **Read and write** (create submission + diagnostics issues)
   - **Contents** → **Read-only** (to check what's already archived)
   - *(Metadata → Read-only is added automatically.)*

> If you created the token earlier for only `marstek-firmware-archiv`, just
> **edit** it and add `marstek-fw-diagnostics` to the repository access — the
> token value stays the same, so nothing changes on the server.
5. Generate and **copy the token now** (shown only once). It looks like
   `github_pat_...` (fine-grained) or `ghp_...` (classic).

> A classic token with the `repo` scope also works, but the fine-grained token
> above is the least-privilege option.

### Where to set it

The token is read from the environment variable `GITHUB_TOKEN` by the systemd
service. Two options — **pick one**:

**Option A — separate env file (recommended, keeps the secret out of the unit):**

```bash
echo 'GITHUB_TOKEN=PASTE_YOUR_TOKEN_HERE' | sudo tee /etc/marstek-fw-checker.env >/dev/null && sudo chmod 600 /etc/marstek-fw-checker.env
```

Then reference it in the unit with `EnvironmentFile=/etc/marstek-fw-checker.env`
(see the unit file in §4).

**Option B — inline in the unit file:** add a line
`Environment=GITHUB_TOKEN=PASTE_YOUR_TOKEN_HERE` to the `[Service]` section.

> The token is **never** committed to git and never sent to the browser — it
> lives only on the server.

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
