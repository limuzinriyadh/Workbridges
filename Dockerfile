FROM node:26-alpine AS build
# Toolchain for native modules (better-sqlite3) when no prebuilt binary matches this Node release.
RUN apk upgrade --no-cache && apk add --no-cache --virtual .build python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# The build needs dev dependencies; they are removed before the copy below.
RUN npm run build && npm prune --omit=dev && apk del .build
FROM node:26-alpine
# The date keys the build cache so this layer installs today's OS fixes; AppJet keeps it current on deploy.
RUN echo "os-refresh 2026-11-24" && apk upgrade --no-cache
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# IMPORTANT: your server MUST listen on 0.0.0.0 and process.env.PORT.
RUN mkdir -p /app /home/appjet && chown -R 10001:10001 /app /home/appjet
ENV HOME=/home/appjet
USER 10001:10001
CMD ["npm","start"]
