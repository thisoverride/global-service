# ─── Stage 1 : build TypeScript ────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ─── Stage 2 : image de production ─────────────────────────────────────────
FROM node:22-slim AS runner

# Le module QEMU pilote le libvirtd de l'hote via le socket monte (voir
# volumes Coolify) : virsh/qemu-img/genisoimage doivent exister dans l'image,
# aucun binding natif Node a compiler. ca-certificates est necessaire pour
# telecharger les images cloud de base en HTTPS (voir modules/qemu/images.ts).
RUN apt-get update && apt-get install -y --no-install-recommends \
      libvirt-clients \
      qemu-utils \
      genisoimage \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY public/ ./public/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "build/main.js"]
