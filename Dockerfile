FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
USER node
CMD ["node", "--import", "tsx", "src/serve.ts"]
