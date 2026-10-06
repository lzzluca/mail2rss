FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
RUN mkdir out && chown node:node out
USER node
CMD ["node", "--import", "tsx", "src/serve.ts"]
