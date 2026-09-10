# syntax=docker/dockerfile:1

# Stage 1: build the static bundle.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve the static files with nginx. No node_modules, no build tools.
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/docker-entrypoint.sh /docker-entrypoint.d/40-render-env.sh
RUN chmod +x /docker-entrypoint.d/40-render-env.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
