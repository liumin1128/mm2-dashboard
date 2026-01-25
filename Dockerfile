# 多阶段构建 Dockerfile for mm2-dashboard

# 阶段 1: 构建阶段
FROM node:24 AS builder

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lockfile
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 阶段 2: 生产运行阶段
FROM node:24 AS runner

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production

# 复制 package.json 和 lockfile
COPY package.json pnpm-lock.yaml ./

# 仅安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/public ./public

# 暴露端口（默认 3000）
EXPOSE 3000

# 启动应用
CMD ["node", ".output/server/index.mjs"]
