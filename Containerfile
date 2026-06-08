# ══════════════════════════════════════════════
# Containerfile — Hábito Estilistes Web
# Imagen base: UBI9 nodejs-20 de Red Hat
#
# Build:   podman build -t localhost/habito-web:dev .
# Run:     podman run -p 8080:8080 localhost/habito-web:dev
# ══════════════════════════════════════════════

# ── Etapa 1: instalar dependencias
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS deps

# /opt/app-root/src es el WORKDIR estándar de UBI9 — ya pertenece al usuario 1001
# No hace falta USER root ni chown
WORKDIR /opt/app-root/src

COPY --chown=1001:0 package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Etapa 2: imagen de producción mínima
FROM registry.access.redhat.com/ubi9/nodejs-20-minimal:latest

LABEL org.opencontainers.image.title="Habito Estilistes Web" \
      org.opencontainers.image.description="Web de la peluquería Hábito Estilistes — Castelldefels" \
      org.opencontainers.image.url="https://github.com/plizeth/habitoestilistes-gitops" \
      org.opencontainers.image.source="https://github.com/plizeth/habitoestilistes-gitops" \
      org.opencontainers.image.vendor="Hábito Estilistes" \
      org.opencontainers.image.licenses="Proprietary"

# Mismo WORKDIR estándar de UBI9 — ya tiene permisos correctos para usuario 1001
WORKDIR /opt/app-root/src

COPY --from=deps --chown=1001:0  /opt/app-root/src/node_modules ./node_modules
COPY --chown=1001:0 server.js .
COPY --chown=1001:0 public ./public

# Usuario no-root — ya es el default en UBI9, pero lo declaramos explícitamente
USER 1001

EXPOSE 8080

ENV PORT=8080 \
    NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["node", "server.js"]

