<div align="center">

![preview](preview.png)

# HomeDirPlus

---

*轻量、快速的个人服务导航页，专为管理内外网服务地址而设计。*

</div>

## 特性

**导航管理**
- 站点分类管理
- 自动抓取网站 favicon
- 导入站点时自动补全网站图标，减少批量迁移后的手动操作
- 支持本地上传站点图标、主站图标和首页背景图
- 后台可视化管理站点、分类、配置

**效率操作**
- `⌘K` 全局搜索，按名称、描述、地址模糊匹配
- 键盘热键绑定，一键直达常用站点
- 可选自动探测网络环境，智能切换内网/外网地址

**体验细节**
- 深色 / 浅色主题，跟随系统自动切换
- 主题切换带 View Transition 过渡动画
- 实时时钟 + 时段问候语
- 分类标签栏带滑动指示器动效
- 首页背景图片、模糊强度与玻璃质感站点卡片
- 首页站点卡片四列紧凑布局，适合更多服务入口
- 长按 ⌘ 键浮层显示所有快捷键
- 全局等宽字体（Geist Mono）
- 数据存储 SQLite 单文件，备份迁移方便


## 相比上游 HomeDir 的增强

HomeDirPlus 基于上游 `52Lxcloud/HomeDir` 持续增强，当前额外包含：

- **Docker 发布链路**：独立发布 `coldboy404/homedirplus`，`latest` 跟随版本 tag，保留 `1.1`/版本号标签一致性校验。
- **后台更新检查**：关于页可检查 GitHub Release / tag，方便确认是否有新版本。
- **导入 / 导出**：支持 HomeDirPlus 与 SunPanel 数据导入，保留分类与排序信息。
- **分类排序**：后台可配置分类排序，首页和后台展示保持一致。
- **图标能力增强**：支持本地上传站点图标、自定义图标 URL、自动抓取 favicon、批量导入时自动补图标。
- **品牌与背景定制**：支持主站图标上传、首页背景图片上传、背景模糊调节。
- **首页视觉优化**：站点卡片改为半透明玻璃效果，四列紧凑布局，并优化背景图可见性。
- **Docker 镜像优化**：裁剪 Alpine 运行时不需要的 sharp glibc 二进制，降低镜像体积。
- **Compose 更新体验**：`docker-compose.yml` 增加 `pull_policy: always` 和 Watchtower 标签，改善面板更新检测。
- **安全与质量修复**：补充 ESLint 配置、PostCSS override、Next Link 修复、类型检查和构建验证流程。

## 技术栈

`Next.js 16` `Tailwind CSS v4` `shadcn/ui` `SQLite` `Lucide React`

## 目录结构

```
src/
├── app/              # 页面路由
│   ├── page.tsx      # 首页
│   ├── dash/         # 后台管理
│   └── api/          # API 路由
├── components/       # 组件
│   ├── admin/        # 后台管理组件
│   └── ui/           # shadcn/ui 基础组件
└── lib/              # 工具库
    ├── db.ts         # 数据库操作
    ├── auth.ts       # 认证逻辑
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
    ports:
      - "4027:4027"
    volumes:
      - ./data:/app/data
```

```bash
docker compose up -d
```

启动后访问 `http://localhost:4027/dash` 设置管理密码。

### 本地开发

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000/dash` 进入后台。数据保存在 `data/` 目录。

---

如果觉得这个项目对你有帮助，欢迎点个 ⭐ 支持一下：<https://github.com/coldboy404/HomeDirPlus>。
