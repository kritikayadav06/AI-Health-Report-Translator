FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
COPY samples ./samples
ENV NODE_ENV=production PORT=5000
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
