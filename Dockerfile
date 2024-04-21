# Use the node image (or Prisma won't work)
FROM node:20-bullseye-slim
WORKDIR /app
# Install Bun
RUN npm install -g bun

ENV NODE_ENV production

COPY package.json .
COPY bun.lockb .
COPY prisma prisma

RUN bun install --production

COPY src src
COPY tsconfig.json .

EXPOSE 3002
RUN bunx prisma generate 

CMD ["bun", "src/index.ts"]

