# Frontend Docker image for HealthPulse
FROM node:20-alpine as builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json .
COPY vite.config.ts .
COPY public ./public
COPY src ./src

RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
