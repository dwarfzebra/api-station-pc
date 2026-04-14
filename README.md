# API Station - 高性能 API 编排与链路调试平台

![Nuxt 4](https://img.shields.io/badge/Nuxt-4.x-emerald.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma-indigo.svg)
![Vue Flow](https://img.shields.io/badge/UI-VueFlow-blue.svg)
![LocalStorage](https://img.shields.io/badge/Log-LocalPersistent-orange.svg)

**API Station** 是一款专为开发者设计的“轻量、极速、私密”的 API 自动化编排平台。它不仅能管理你的 API 资产，还能通过直观的可视化界面将多个接口串联成复杂的业务链路，并提供高保真的执行快照。

---

## ✨ 核心特性

- **🚀 线性链路编排**：从单接口调试到跨服务全链路测试，像搭积木一样编排你的业务流程。
- **🔄 上下文自动解耦**：自研的数据映射引擎，支持将上游响应结果注入到下游的 Query、Body、Headers 或 Path 参数中。
- **🛡️ 纯净本地日志**：执行历史与高保真请求/响应快照完全存储于浏览器 `localStorage`，不占用服务器空间，保护数据隐私，实现瞬时加载。
- **💎 极简美学 UI**：基于极客风深色模式设计，集成 cURL 一键复制、语法高亮、自动路径替换等贴心功能。
- **🌐 多环境管理**：解耦 API 定义与环境域名，支持一键切换测试与生产环境。

---

## 🛠️ 技术栈

- **框架**: [Nuxt 4](https://nuxt.com/) (Vue 3 + Nitro)
- **数据库**: MySQL / MariaDB + [Prisma](https://www.prisma.io/)
- **可视化**: [Vue Flow](https://vueflow.dev/) (底层架构支持)
- **UI 设计**: Tailwind CSS + Lucide Icons
- **通信**: Axios + Fetch

---

## 📸 界面预览

*（建议在此处加入项目运行时的截图）*

- **分组管理**：按域管理 API 集合及环境配置。
- **链路编排**：可视化处理步骤间的参数依赖。
- **日志钻取**：链路执行历史支持按步骤展开查看高保真请求快照。

---

## 🚀 快速启动

### 1. 克隆项目
```bash
git clone https://github.com/your-username/api-station-pc.git
cd api-station-pc
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置数据库
在 `.env` 中设置你的 MySQL 连接字符串：
```env
DATABASE_URL="mysql://user:pass@localhost:3306/api_station"
```

### 4. 同步并运行
```bash
npx prisma db push
pnpm dev
```
打开浏览器访问 `http://localhost:3000` 即可开始编排。

---

## 📦 部署方案

请参考详细的 [部署指南 (DEPLOY.md)](./DEPLOY.md)。

---

## 🤝 贡献说明

我们欢迎任何形式的贡献，包括功能建议、代码优化或 Bug 汇报。

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

---

## 📄 开源协议

本项目基于 **MIT License** 协议开源。
