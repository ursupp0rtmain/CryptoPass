# CryptoPass Update & Deployment Guide

## Voraussetzungen

- **Podman** installiert (Windows mit WSL)
- **GitHub PAT** mit `write:packages` Berechtigung
- Zugang zu **Portainer** auf dem Server

---

## Frontend Update (CryptoPass.UserApp)

### 1. Code ändern und testen

```bash
cd CryptoPass.UserApp
npm install
npm run serve   # Lokal testen unter http://localhost:4200
```

### 2. Produktions-Build erstellen

```bash
cd CryptoPass.UserApp

# Environment setzen (optional)
export CERAMIC_NODE_URL="https://ceramic.ursupportmain.com"

# Build
npm run build
```

### 3. Docker Image bauen

```bash
# Von WSL aus bauen (wichtig für Podman auf Windows)
podman machine ssh "cd /mnt/c/Users/stocker/Documents/Workspace/CryptoPass/CryptoPass.UserApp && podman build -t ghcr.io/ursupp0rtmain/cryptopass-frontend:latest ."
```

### 4. Bei ghcr.io einloggen (falls nötig)

```bash
podman login ghcr.io -u ursupp0rtmain
# Passwort: Dein GitHub Personal Access Token
```

### 5. Image pushen

```bash
podman push ghcr.io/ursupp0rtmain/cryptopass-frontend:latest
```

### 6. In Portainer deployen

1. Öffne Portainer → Stacks → **cryptopass**
2. Klicke auf **Pull and redeploy**
3. Warte bis alle Container grün sind

---

## Schnelle Update-Befehle (Copy & Paste)

```bash
# Alles in einem Befehl (nach Code-Änderungen)
cd CryptoPass.UserApp && \
npm run build && \
podman machine ssh "cd /mnt/c/Users/stocker/Documents/Workspace/CryptoPass/CryptoPass.UserApp && podman build -t ghcr.io/ursupp0rtmain/cryptopass-frontend:latest ." && \
podman push ghcr.io/ursupp0rtmain/cryptopass-frontend:latest
```

---

## Versionierung (Optional)

Statt nur `latest` zu verwenden, kannst du auch Versionen taggen:

```bash
# Mit Version taggen
podman tag ghcr.io/ursupp0rtmain/cryptopass-frontend:latest ghcr.io/ursupp0rtmain/cryptopass-frontend:v1.0.0

# Beide pushen
podman push ghcr.io/ursupp0rtmain/cryptopass-frontend:latest
podman push ghcr.io/ursupp0rtmain/cryptopass-frontend:v1.0.0
```

---

## Docker Compose Änderungen

Wenn du `deployment/docker-compose.yml` änderst:

```bash
cd CryptoPass
git add deployment/docker-compose.yml
git commit -m "beschreibung der änderung"
git push
```

Dann in Portainer → Stack → **Pull and redeploy**

---

## Troubleshooting

### "denied" beim Push
```bash
# Neu einloggen
podman login ghcr.io -u ursupp0rtmain
```

### "image not known" beim Push
```bash
# Image wurde nicht gebaut - erst bauen!
podman machine ssh "cd /mnt/c/Users/stocker/Documents/Workspace/CryptoPass/CryptoPass.UserApp && podman build -t ghcr.io/ursupp0rtmain/cryptopass-frontend:latest ."
```

### Build schlägt fehl wegen SCSS Budget
Budget in `angular.json` erhöhen oder SCSS optimieren.

### Port bereits belegt
Ports in `deployment/docker-compose.yml` ändern (aktuell: 8080, 8443, 81).

---

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://SERVER_IP:8080 |
| NPM Admin | http://SERVER_IP:81 |
| Ceramic | intern auf Port 7007 |
| IPFS | intern auf Port 5001/8080 |

---

## Lokale Images auflisten

```bash
podman images | grep cryptopass
```

## Alte Images löschen

```bash
podman image prune -a
```
