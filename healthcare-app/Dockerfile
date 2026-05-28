# Frontend Docker image for HealthPulse
FROM node:20-alpine as builder
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
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
