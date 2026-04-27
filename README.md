<div align="center">

![preview](preview.png)

# HomeDirPlus

---

*轻量、快速的个人服务导航页，专为管理内外网服务地址而设计。*

</div>

## 特性

**导航管理**
- 站点分类管理与分类排序
- 自动抓取网站 favicon
- 导入站点时自动补全网站图标，减少批量迁移后的手动操作
- 支持本地上传站点图标、主站图标和首页背景图
- 首页内联管理面板：点击设置后原地弹窗登录和管理，不再依赖 `/dash` 后台路径

**效率操作**
- `⌘K` 全局搜索，按名称、描述、地址模糊匹配
- 键盘热键绑定，一键直达常用站点
- 可选自动探测网络环境，智能切换内网/外网地址

**体验细节**
- 深色 / 浅色主题，跟随系统自动切换
- 主题切换带 View Transition 过渡动画
- 实时时钟 + 时段问候语
- 分类标签栏带滑动指示器动效
- 首页背景图片、模糊强度与玻璃质感站点卡片；背景遮罩默认为 0，尽量保留原图可见性
- 首页站点卡片四列紧凑布局，适合更多服务入口
- 长按 ⌘ 键浮层显示所有快捷键
- 全局等宽字体（Geist Mono）
- 数据存储 SQLite 单文件，备份迁移方便

## 当前版本重点

`v1.3.x` 之后，HomeDirPlus 的管理入口已经改为首页内联弹窗：

- 首页 `/` 公开访问。
- 点击右上角设置按钮，弹出登录框或管理面板。
- 登录、保存配置、站点增删改、分类、快捷键、导入导出等操作均走普通 JSON API。
- `/dash` 与 `/dash/login` 仅保留兼容跳转，不再作为主要入口。
- 针对 EdgeOne / 复杂反代链路做了登录态兜底：保留 httpOnly cookie，同时支持本地 session token + `x-admin-session` 请求头。

因此公网反代通常只需要保证以下路径正常转发：

```text
/
/_next/*
/api/*
```

不需要再单独配置 `/dash`。

## 相比上游 HomeDir 的增强

HomeDirPlus 基于上游 `52Lxcloud/HomeDir` 持续增强，当前额外包含：

- **Docker 发布链路**：独立发布 `coldboy404/homedirplus`，版本 tag、`latest` 与次版本别名保持一致；仅保留必要 tag，避免面板误报更新。
- **首页内联管理**：设置入口在首页弹窗中完成登录和管理，减少反代路径依赖。
- **后台更新检查**：关于页可检查 GitHub Release / tag，方便确认是否有新版本。
- **导入 / 导出**：支持 HomeDirPlus 与 SunPanel 数据导入，保留分类与排序信息。
- **分类排序**：后台可配置分类排序，首页和后台展示保持一致。
- **图标能力增强**：支持本地上传站点图标、自定义图标 URL、自动抓取 favicon、批量导入时自动补图标。
- **品牌与背景定制**：支持主站图标上传、首页背景图片上传、背景模糊调节。
- **首页视觉优化**：站点卡片改为半透明玻璃效果，四列紧凑布局，并优化背景图可见性。
- **Docker 镜像优化**：裁剪 Alpine 运行时不需要的 sharp glibc 二进制，降低镜像体积。
- **Compose 更新体验**：`docker-compose.yml` 增加 `pull_policy: always` 和 Watchtower 标签，改善面板更新检测。
- **安全与质量修复**：补充 ESLint 配置、PostCSS override、Next Link 修复、类型检查和构建验证流程。

## 关于体积

HomeDirPlus 功能不算复杂，但基于 `Next.js + React + SQLite 原生模块`，镜像体积主要来自运行时框架和原生依赖，而不是业务代码本身：

- Next.js standalone server
- React / React DOM
- better-sqlite3 原生二进制
- sharp / libvips 图像处理依赖
- Node Alpine 基础镜像

项目源码约几千行，真正占体积的是框架运行时。后续如果追求极致轻量，可以考虑迁移到 Vite/纯 API 服务/更小的 UI 运行时；但当前架构的优点是开发效率高、SSR/API 一体、Docker 部署简单。

## 技术栈

`Next.js 16` `Tailwind CSS v4` `shadcn/ui` `SQLite` `Lucide React`

## 目录结构

```text
src/
├── app/              # 页面和 API 路由
│   ├── page.tsx      # 首页
│   ├── api/          # 登录、管理、图标 API
│   └── dash/         # 兼容入口，跳回首页
├── components/       # 组件
│   ├── admin/        # 管理面板组件
│   └── ui/           # shadcn/ui 基础组件
└── lib/              # 工具库
    ├── db.ts         # 数据库操作
    ├── auth.ts       # 认证逻辑
    ├── admin-service.ts # 管理 API 服务逻辑
    └── icons.ts      # 图标处理
```

## 快速开始

### Docker 部署（推荐）

```yaml
# docker-compose.yml
services:
  homedirplus:
    image: coldboy404/homedirplus:latest
    container_name: homedirplus
    restart: unless-stopped
    pull_policy: always
    ports:
      - "4027:4027"
    volumes:
      - ./data:/app/data
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

```bash
docker compose up -d
```

启动后访问：

```text
http://localhost:4027
```

点击首页右上角设置按钮，首次使用会进入管理登录流程。

### 反代 / HTTPS 示例

Nginx 示例：

```nginx
server {
    listen 443 ssl http2;
    server_name nav.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4027;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

如果使用 EdgeOne / CDN / WAF，建议不要缓存：

```text
/api/*
/_next/server/*
```

### 更新

```bash
docker compose pull
docker compose up -d
```

### 本地开发

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`，点击首页设置按钮进入管理。

---

如果觉得这个项目对你有帮助，欢迎点个 ⭐ 支持一下：<https://github.com/coldboy404/HomeDirPlus>。
