# API Station PC 部署指南

本项目基于 **Nuxt 4** 和 **Prisma (MySQL/MariaDB)** 构建。以下是生产环境部署的详细步骤。

## 1. 环境依赖
部署前请确保服务器已安装以下环境：
- **Node.js**: v18.0.0 或更高版本 (推荐 v20+)
- **pnpm**: 推荐使用 pnpm 进行包管理
- **MySQL / MariaDB**: 作为持久化数据库
- **PM2**: (推荐) 用于 Node.js 进程守护

## 2. 环境变量配置
在项目根目录创建 `.env` 文件，并配置以下关键变量：

```env
# 数据库连接地址
# 格式: mysql://用户名:密码@服务器地址:端口/数据库名
DATABASE_URL="mysql://root:password@localhost:3306/api_station"

# 端口配置 (可选，默认为 3000)
PORT=3000
```

## 3. 部署步骤

### 第一步：安装依赖
```bash
pnpm install
```

### 第二步：同步数据库
使用 Prisma 将模型同步到生产数据库。注意：这会根据 `schema.prisma` 创建表结构。
```bash
npx prisma db push
```

### 第三步：生成 Prisma Client
确保本地生成的查询代码与服务器环境匹配：
```bash
npx prisma generate
```

### 第四步：编译构建
构建 Nuxt 生产包：
```bash
pnpm build
```
编译完成后，所有的代码会打包在 `.output/` 目录下。

## 4. 运行项目

### 方式 A：直接运行 (仅测试)
```bash
node .output/server/index.mjs
```

### 方式 B：使用 PM2 守护运行 (推荐)
在根目录运行以下命令：
```bash
pm2 start .output/server/index.mjs --name "api-station-pc"
```

## 5. 注意事项
1. **日志存储**: 本项目目前采用 **本地浏览器持久化 (Local Storage)** 存储执行日志，不占用服务器磁盘空间。
2. **端口转发**: 默认监听 `3000` 端口。如果需要外网访问，请配置 Nginx 反向代理，并将流量转发至服务器的 3000 端口。
3. **数据库备份**: 定期导出 MySQL 数据，防止业务配置丢失。
4. **环境变量**: 对于生产环境，务必确保 `DATABASE_URL` 的安全性。

## 6. 更新流程
代码更新后，请执行以下命令序列：
```bash
git pull                   # 拉取代码
pnpm install               # 安装新依赖
npx prisma db push         # 同步数据库变更 (如果有)
pnpm build                 # 重新构建
pm2 restart api-station-pc # 重启服务
```
