# ─── Stage 1 : build TypeScript ────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
# --include=dev : Coolify injecte les variables d'environnement de l'app (dont
# NODE_ENV=production) au moment du build, ce qui ferait sinon sauter les
# devDependencies (typescript/tsc) sans qu'on le voie tant qu'on ne teste pas
# le vrai build en conditions reelles.
RUN npm ci --include=dev
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ─── Stage 2 : image de production ─────────────────────────────────────────
FROM node:22-slim AS runner

# Le module QEMU pilote le libvirtd de l'hote via le socket monte (voir
# volumes Coolify) : virsh/qemu-img/genisoimage doivent exister dans l'image,
# aucun binding natif Node a compiler. ca-certificates est necessaire pour
# telecharger les images cloud de base en HTTPS (voir modules/qemu/images.ts).
# python3 sert au relais du module fail2ban : son serveur ne parle qu'un
# protocole pickle sur socket UNIX, illisible depuis Node (voir
# modules/fail2ban/f2b.py). On installe l'interpréteur, pas le paquet
# fail2ban complet — inutile d'embarquer un second serveur dans l'image.
# NB : "python3" et non "python3-minimal", qui fournit l'interpréteur SANS
# la bibliothèque standard — json, socket et pickle y manquent.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libvirt-clients \
      qemu-utils \
      genisoimage \
      python3 \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY public/ ./public/

ENV NODE_ENV=production

# Sans TZ, le conteneur tourne en UTC : toutes les dates affichees par la
# console (tentatives de connexion, sauvegardes, journaux) apparaissaient
# deux heures avant l'heure reelle du serveur. tzdata est deja dans l'image
# de base node:22-slim, il n'y a que la variable a poser.
ENV TZ=Europe/Paris

EXPOSE 3000

CMD ["node", "build/main.js"]
