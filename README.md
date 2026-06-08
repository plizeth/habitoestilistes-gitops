# Hábito Estilistes — Web GitOps

Web de la peluquería **Hábito Estilistes** (Castelldefels, Barcelona).  
Desplegada en **OpenShift** via **GitOps** con ArgoCD.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS (Playfair Display / DM Sans) |
| Backend | Node.js + Express + Socket.io |
| Contenedor | **Podman** + imagen base **UBI9** de Red Hat |
| Registro | [Quay.io](https://quay.io/plizeth/habito-web) |
| Orquestación | OpenShift (OCP) |
| GitOps | ArgoCD (OpenShift GitOps Operator) |
| CI/CD | GitHub Actions |

---

## Estructura del repositorio

```
habitoestilistes-gitops/
├── Containerfile               ← Build con Podman (UBI9)
├── podman-compose.yml          ← Desarrollo local
├── package.json
├── server.js                   ← Servidor Node.js
│
├── public/                     ← Archivos estáticos
│   ├── index.html
│   ├── styles.css
│   ├── chat.js
│   ├── admin.html
│   ├── admin.js
│   └── assets/                 ← Imágenes, logo
│
├── k8s/
│   ├── base/                   ← Manifiestos base (Deployment, Service, Route)
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   ├── service-route.yaml
│   │   └── kustomization.yaml
│   ├── overlays/prod/          ← Configuración de producción (2 réplicas)
│   │   └── kustomization.yaml
│   └── argocd-application.yaml ← Apunta ArgoCD a este repo
│
└── .github/workflows/
    └── build-push.yml          ← CI/CD: Podman build → Quay.io → ArgoCD
```

---

## Desarrollo local con Podman

### Prerequisitos
```bash
# Instalar Podman
# Mac:
brew install podman
podman machine init && podman machine start

# RHEL/Fedora:
sudo dnf install podman

# Ubuntu:
sudo apt install podman

# Instalar podman-compose
pip3 install podman-compose
```

### Arrancar en local
```bash
# Clonar el repositorio
git clone https://github.com/plizeth/habitoestilistes-gitops.git
cd habitoestilistes-gitops

# Instalar dependencias Node.js (solo una vez)
npm install

# Opción A: con podman-compose (recomendado para desarrollo)
podman-compose up

# Opción B: build manual + run
podman build -f Containerfile -t habito-web:dev .
podman run -p 8080:8080 \
  -e NODE_ENV=development \
  -v ./public:/app/public:ro,z \
  habito-web:dev
```

Abre **http://localhost:8080** en tu navegador.

---

## Flujo GitOps (producción)

```
git push origin main
        │
        ▼
GitHub Actions (build-push.yml)
  1. Instala Podman en el runner
  2. podman build -f Containerfile
  3. podman push quay.io/plizeth/habito-web:SHA
  4. Actualiza k8s/overlays/prod/kustomization.yaml
  5. git commit + push → [skip ci]
        │
        ▼
ArgoCD detecta el cambio en el manifiesto
  → oc apply -k k8s/overlays/prod/
  → Rolling update del pod en OpenShift
        │
        ▼
🟢 Web actualizada en OCP
```

---

## Primer despliegue en OpenShift

### 1. Configurar secretos en GitHub
En tu repo → **Settings → Secrets → Actions**:
- `QUAY_USERNAME`: tu usuario de quay.io
- `QUAY_PASSWORD`: tu contraseña de quay.io

### 2. Crear imagen por primera vez
```bash
# Hacer cualquier commit y push a main
git add . && git commit -m "feat: primera imagen" && git push
```

### 3. Configurar ArgoCD en OCP
```bash
# Instalar OpenShift GitOps Operator desde OperatorHub (consola OCP)
# O desde CLI:
oc apply -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml \
  -n openshift-gitops

# Registrar la aplicación en ArgoCD
oc apply -f k8s/argocd-application.yaml
```

### 4. Ver la app desplegada
```bash
oc get route -n habito-web
# Copia la URL y abre en el navegador
```

---

## Variables de entorno

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto del servidor | `8080` |
| `NODE_ENV` | Entorno (development/production) | `production` |
| `N8N_WEBHOOK_URL` | URL del webhook de n8n para el chat | vacío (opcional) |
| `MERGE_DELAY_MS` | Tiempo de agrupación de mensajes del chat (ms) | `3500` |

El `N8N_WEBHOOK_URL` se configura como Secret en OCP:
```bash
oc create secret generic habito-secrets \
  --from-literal=n8n-webhook-url="https://TU_N8N/webhook/..." \
  -n habito-web
```
