# dsh-pet-live2d（桌面客户端修复版）

给 DeepSeek Harness 用的 Live2D 桌宠，自带 **DS鲸鱼娘**。

这是 [`A8Chann/dsh-pet-live2d`](https://github.com/A8Chann/dsh-pet-live2d) 的 **fork**，只干一件事：
修好**官方桌面客户端**（DSH NEXT / Electron，页面 origin 是 `dsh-app://app`）下**贴图全部 403、模型只剩骨架**的问题。

> 浏览器里跑 `dsh web` 的用户用原版就够了；这个 fork 是给桌面客户端的。

## 装它

```
插件 → 添加插件 → dsh-pet-live2d-fix → 安装 → 立即启用
```

装完**重启一次** DSH（客户端 bundle 不做热重载）。首次显示时宿主会去 Live2D 官方 CDN 取一次
Cubism Core 并缓存到 `$DSH_HOME/pets/.runtime/`，那一下需要联网，之后离线可用。

**不要和原版 `dsh-pet-live2d` 同时装**：两者用同一组 HTTP 路由（`/api/live2d-pet/*`）和同一个
宠物 id，会打架。

## 修了什么

官方桌面客户端的 Host 有一道**原生令牌闸**：页面主线程发出的请求会带上令牌，而 Pixi 取贴图是在
**blob Worker** 里发出的，Worker 不在那个 frame 上、没有令牌 —— 于是
`GET /api/live2d-pet/asset/<pet>/textures/*.png` 全部 `403 Forbidden`，moc3 能加载、贴图全丢，
看上去就是"装了但只有一坨骨架"。

修法（两处，改动很小）：

1. **宿主半区** `lib/index.js`：asset 路由接受 `?inline-textures=1`。带这个参数请求模型 JSON 时，
   把 `FileReferences.Textures` 就地换写成 `data:image/png;base64,...` 再返回。
2. **浏览器半区** `lib/client.js`：在 `dsh-app:` 协议下给模型地址自动挂上这个参数。

贴图因此变成**绝对 data: 地址**，Worker 在本地解码，不联网、不过闸。基准地址仍是正常的模型地址，
相对路径（moc3 / physics / motions）照常解析。

另外把 `package.json` 的包名、`cordis.patch.yml` 的插件行、`lib/client.js` 的模块 id 与
`PACKAGE_NAME` 改成了 scoped 名，避免和原版冲突。

完整 diff 见 [../patches/](../patches/)。

## 与原版的关系

- 版本：基于 `3.3.3`，功能与原版一致
- 原版文档（配置、装扮、相位、自制宠物）：[README.upstream.md](./README.upstream.md)
- 上游仓库：https://github.com/A8Chann/dsh-pet-live2d
- 这个修复也提过给上游：合并后请优先用原版

## 许可（重要）

| 部分 | 许可 |
|---|---|
| 插件代码（含本 fork 的修改） | **MIT**，见 [LICENSE](./LICENSE) |
| DS鲸鱼娘模型（`pets/ds-whale-girl/`） | **CC BY-NC-SA 4.0**：署名、**非商业**、相同方式共享 |
| Cubism Core | Live2D 专有，**不随包分发**，运行时从官方 CDN 取 |

**非商业**：个人使用、公司内部使用都没问题；拿去做商业产品需要分别取得三位作者授权。
署名与版权链见 [NOTICE.md](./NOTICE.md)。
