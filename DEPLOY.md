# Deployment

The tool is a React/Vite SPA (built to `dist/`) plus a small Node/Express backend
(`marstek-server.cjs`) that serves `dist/` and proxies the Marstek + GitHub-archive
API calls. It runs behind Apache (KeyHelp) at
`https://sphings-dev.de/marstek/marstek-fw-checker/`.

Apache already proxies both paths to Node on port 3000:

```apache
ProxyPass        /marstek/marstek-fw-checker/ http://127.0.0.1:3000/
ProxyPassReverse /marstek/marstek-fw-checker/ http://127.0.0.1:3000/
ProxyPass        /.netlify/functions/ http://127.0.0.1:3000/.netlify/functions/
ProxyPassReverse /.netlify/functions/ http://127.0.0.1:3000/.netlify/functions/
```

`GITHUB_TOKEN` (for the archive-donation feature) lives in the systemd unit
`/etc/systemd/system/marstek-fw-checker.service` and is unaffected by app updates.

**Requirement:** Node.js ≥ 20.19 on the server (Vite 7). Check with `node -v`.

---

## First-time migration (vanilla → React), one-time

Run over SSH. Replaces the old manually-uploaded version with a git checkout.

```bash
# 0) Node version — must be >= 20.19
node -v

# 1) Stop the service
sudo systemctl stop marstek-fw-checker

# 2) Back up the old version, clone the repo
cd /home/users/sphings-dev
sudo mv marstek-fw-checker marstek-fw-checker-vanilla-backup
sudo git clone https://github.com/sphings79/marstek-fw-checker.git marstek-fw-checker
cd marstek-fw-checker

# 3) Install deps + build the SPA
sudo npm install
sudo npm run build
sudo chown -R sphings-dev:sphings-dev /home/users/sphings-dev/marstek-fw-checker

# 4) Point systemd at the new (.cjs) server entry
sudo sed -i 's#marstek-server\.js#marstek-server.cjs#' /etc/systemd/system/marstek-fw-checker.service
sudo systemctl daemon-reload

# 5) Start + verify
sudo systemctl start marstek-fw-checker
sudo systemctl status marstek-fw-checker --no-pager
```

Then open `https://sphings-dev.de/marstek/marstek-fw-checker/` and hard-reload (Ctrl+F5).
The status output should show `active (running)` and `GITHUB_TOKEN: ✅ gesetzt`.

---

## Updating later (after the migration)

```bash
cd /home/users/sphings-dev/marstek-fw-checker
sudo ./deploy.sh
```

`deploy.sh` runs `git pull` + `npm install` + `npm run build` + restart.

---

## Rollback to the vanilla version

```bash
sudo systemctl stop marstek-fw-checker
cd /home/users/sphings-dev
sudo rm -rf marstek-fw-checker
sudo mv marstek-fw-checker-vanilla-backup marstek-fw-checker
sudo sed -i 's#marstek-server\.cjs#marstek-server.js#' /etc/systemd/system/marstek-fw-checker.service
sudo systemctl daemon-reload
sudo systemctl start marstek-fw-checker
```

(The vanilla version also lives on the `legacy-vanilla` branch and the `v1-vanilla` tag.)
