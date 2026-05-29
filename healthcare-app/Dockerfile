# Frontend Docker image for HealthPulse
FROM node:22-alpine as builder
WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY .env* ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginx:stable-alpine
RUN apk add --no-cache openssl
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=healthpulse"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
