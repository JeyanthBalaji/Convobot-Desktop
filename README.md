# ConvoBot Clinic — Desktop App

Electron wrapper around the ConvoBot Clinic web app. Produces a Windows
`.exe` installer with silent auto-update support (like WhatsApp /
Spotify).

The desktop app is a thin shell — all business logic, code, and data
live on the server (default: `https://convobot-frontend-8ybs.onrender.com`).
The client only ever sees the rendered UI; the source code never leaves
the server.

---

## Folder layout

```
ConvoBot Desktop/
├── package.json          electron-builder config + dependencies
├── src/
│   └── main.js           Electron main process (window, menu, updater)
├── build/
│   ├── icon.ico          Windows app icon (multi-resolution)
│   ├── icon.png          Icon used in dev / Linux / fallback
│   └── LICENSE.txt       EULA shown by the installer
├── .gitignore
└── README.md             (this file)
```

---

## Prerequisites (one-time setup on your dev machine)

You already have **Node.js 20+** installed for the React frontend, so
nothing extra is needed.

To verify:

```bash
node --version    # should print v20.x or later
npm --version
```

---

## Install dependencies (one-time, ~2-3 min)

```bash
cd "/c/Users/JAYANTHBALAJI/Desktop/Convo/Archive/ConvoBot Desktop"
npm install
```

This downloads Electron, electron-builder and electron-updater into
`node_modules/`. About 500 MB total.

---

## Run the app locally (test mode)

```bash
npm start
```

A desktop window opens showing the live ConvoBot login page. This is
the same UI the client will see in the installer — useful for sanity
checks before building.

The auto-updater is disabled in dev mode (only runs in the packaged app).

---

## Build the Windows installer

```bash
npm run build:win
```

This produces:

```
dist/ConvoBot-Clinic-Setup-1.0.0.exe          ← the installer
dist/latest.yml                                ← auto-update manifest
dist/ConvoBot-Clinic-Setup-1.0.0.exe.blockmap  ← incremental-update map
```

The first build takes ~5 minutes (downloads the Windows packaging tools).
Subsequent builds are <1 minute.

Send `ConvoBot-Clinic-Setup-1.0.0.exe` to the client. They double-click,
follow the wizard, and the app appears in their Start Menu and Desktop.

---

## Publishing a new version (auto-update)

1. Bump the `version` in `package.json` (e.g. `1.0.1`).
2. Build:  `npm run build:win`
3. Create a GitHub Release on the `Convobot-Desktop` repo with that
   version tag, and upload **both** files from `dist/`:
   - `ConvoBot-Clinic-Setup-1.0.1.exe`
   - `latest.yml`
4. Existing clients will pick up the update on their next launch
   (or within 4 hours if already open). It downloads silently in the
   background and installs when they next close the app.

> Tip: setting the env var `GH_TOKEN` and running `npm run publish`
> automates steps 3 (creates the release and uploads the files).

---

## Pointing the app at a different server later

The backend URL is read from the env var `CONVOBOT_URL` at runtime,
falling back to the hard-coded default in `src/main.js`. To switch a
specific install to a different server:

1. Edit the default in `src/main.js`.
2. Bump the version + publish a new release.
3. Auto-updater pushes the change.

(For a per-install switch — e.g. one client on your Render, another on
their own — we can add a `settings.json` reader in a follow-up version.
Today the URL is set at build time.)

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `electron not found` after `npm install` | Re-run `npm install`. Check internet — the Electron binary download (~150 MB) is the most common failure point. |
| Blank window on launch | The remote site is down. Check `https://convobot-frontend-8ybs.onrender.com` in a browser. |
| "Cannot reach ConvoBot servers" dialog | Client has no internet, or Render is down. |
| Installer warning "Unknown publisher" | Expected until we add a code-signing certificate. Click "More info" → "Run anyway". |
| Auto-update never triggers | Check the version on GitHub Release is **higher** than the installed version. Logs at `%APPDATA%\ConvoBot Clinic\logs\main.log`. |
