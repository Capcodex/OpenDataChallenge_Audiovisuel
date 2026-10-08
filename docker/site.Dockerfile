# syntax=docker/dockerfile:1
# Image du site (CdC technique § 5.2, § 5.6). Multi-étapes :
#   dev      serveur Vite avec rechargement à chaud, tests Vitest (service « site-dev »)
#   build    build Vite et pré-compression
#   runtime  nginx non privilégié servant dist/ (service « site », production)
# Images de base figées par empreinte : à mettre à jour volontairement (CdC technique § 5.5).

FROM node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS base
WORKDIR /app/site
RUN chown node:node /app/site
USER node
# Dépendances d'abord, pour profiter du cache des couches.
COPY --chown=node:node site/package.json site/package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci --no-audit --no-fund

FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS build
COPY --chown=node:node site/ ./
RUN npm run build \
    && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \
       -o -name '*.svg' -o -name '*.csv' -o -name '*.md' -o -name '*.gexf' \) \
       -size +1k -exec gzip -9 -k -n {} +

FROM nginxinc/nginx-unprivileged:stable-alpine-slim@sha256:3af0c10d960cc2502427fe1219c52989d309e7d65596869c60a34fd2fa2406f0 AS runtime
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
USER root
RUN rm -rf /etc/nginx/conf.d /usr/share/nginx/html/*
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx-entetes.conf /etc/nginx/entetes.conf
COPY --from=build /app/site/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
# Démarrage rapide (start_interval) réglé dans compose.yaml ; hadolint ne connaît pas encore cette option.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
