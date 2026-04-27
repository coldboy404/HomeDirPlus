FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build \
    # Next standalone tracing may include both glibc and musl sharp binaries.\
    # The runtime image is Alpine/musl, so the glibc variants are dead weight.\
    && rm -rf .next/standalone/node_modules/.pnpm/@img+sharp-libvips-linux-x64@* \
              .next/standalone/node_modules/.pnpm/@img+sharp-linux-x64@* \
    # The standalone server does not need development-only Next internals or font metric tables at runtime.\
    && rm -f .next/standalone/node_modules/.pnpm/next@*/node_modules/next/dist/server/capsize-font-metrics.json \
    && rm -rf .next/standalone/node_modules/.pnpm/next@*/node_modules/next/dist/server/dev \
              .next/standalone/node_modules/.pnpm/next@*/node_modules/next/dist/compiled/webpack \
              .next/standalone/node_modules/.pnpm/next@*/node_modules/next/dist/compiled/babel*

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=4027
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /app/data/icons
EXPOSE 4027
CMD ["node", "server.js"]
