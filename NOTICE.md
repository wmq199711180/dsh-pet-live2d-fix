# NOTICE

本包是 [`dsh-pet-live2d`](https://github.com/A8Chann/dsh-pet-live2d) 的 fork。以下信息随包保留，
不得删除或改写。

## 版权链

| 环节 | 贡献者 | 内容 |
|---|---|---|
| 角色原作 | **上善无形** | 原创 OC「溟月」 |
| DeepSeek 女仆二创 | **ZipZipPipe** | 鲸鱼娘形象二创 |
| Live2D 模型 | **氵六青** | 本包 `pets/ds-whale-girl/` 使用的模型 |
| 插件作者（上游） | **A8Chann** | `dsh-pet-live2d` 全部代码与打包 |
| 本 fork 修改 | **wmq199711180** | 桌面客户端贴图 403 修复、包名与模块 id 调整 |

## 许可

- **插件代码**：MIT。原版权声明见 [LICENSE](./LICENSE)；本 fork 的修改同样以 MIT 发布。
- **DS鲸鱼娘模型**（`pets/ds-whale-girl/`、`icon.png`）：**CC BY-NC-SA 4.0**
  （署名 · **非商业** · 相同方式共享）。完整许可见 `pets/ds-whale-girl/LICENSE`。
  商业使用需分别取得上述三位作者的授权。
- **Cubism Core**：Live2D 株式会社的专有运行时，**不随本包分发**。缺失时由宿主半区从
  Live2D 官方 CDN 取一份并缓存到 `$DSH_HOME/pets/.runtime/live2dcubismcore.min.js`。

## 相对上游 3.3.3 的修改

1. `lib/index.js` — asset 路由支持 `?inline-textures=1`，把模型 JSON 里的贴图换写成 `data:` URL。
2. `lib/client.js` — `dsh-app:` 协议下自动追加上述参数；`__ModuleLoader__` id 与 `PACKAGE_NAME`
   改为 `@wmq199711180/dsh-pet-live2d`。
3. `package.json` / `cordis.patch.yml` — 包名与插件行改为 scoped 名。

除上述外，代码与资产与上游 3.3.3 一致。
