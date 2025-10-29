# Vista

Vista 是一个基于浏览器的实时定位页面，可部署至 GitHub Pages 并支持离线访问。页面使用原生 HTML/CSS/JS 构建，所有资源本地化且无后端依赖。

## 功能
- 持续使用浏览器 Geolocation API 获取经纬度、海拔、速度与定位精度。
- 以度分秒（DMS）格式显示经纬度，并根据半球自动切换标签。
- 支持速度单位 km/h 与 m/s 切换，信息细节模块和速度模块可按需隐藏。
- 提供中文与英文界面语言、浅色与深色主题，偏好通过 `localStorage` 持久化。
- PWA 支持：首次在线访问后缓存静态资源，离线时仍可打开页面。
- 不上传或存储任何定位数据，完全前端实现。

## 本地预览
1. 在仓库根目录启动一个静态服务器，例如：
   ```bash
   npx serve vista
   ```
2. 使用浏览器访问输出地址（通常为 `http://localhost:3000`），允许定位权限即可查看实时数据。

## 离线测试
1. 在浏览器打开页面后，进入开发者工具 `Application` 面板。
2. 在 `Service Workers` 区域勾选 **Offline**，或在 `Network` 面板切换到离线模式。
3. 刷新页面，确认离线状态仍可加载并使用已有定位数据/占位符。

## 发布到 GitHub Pages
1. 将 `vista` 目录内容推送到仓库 `main` 分支根目录。
2. 在仓库 `Settings` → `Pages` 中，将 **Build and deployment** 设为 `Deploy from a branch`，分支选择 `main`，目录选择 `/(root)`。
3. 保存设置后等待部署完成，访问 `https://<username>.github.io` 即可使用。
