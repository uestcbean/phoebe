# 📄 隐私政策

**插件名称：** Phoebe  
**发布日期：** 2025年6月

[English Version](pp_en.md) | 中文版

---

## 1. 数据收集与使用

本插件不会收集、存储或共享任何用户的个人身份信息（PII）。

插件仅在用户主动操作时运行，包括：

- 用户在网页中选中部分文字
- 用户通过右键菜单点击"保存到 Notion"
- 插件调用 Chrome 的 selectionText API 获取选中文本内容
- 将文本通过 Notion API 写入用户指定的 Notion 数据库

> ⚠️ 插件不会自动读取网页，也不会抓取或访问未选中的内容。

## 2. 权限使用说明

本插件使用以下权限：

- `activeTab`：仅在用户选择文本时访问当前标签页
- `contextMenus`：提供右键菜单功能
- `storage`：存储用户配置信息
- `host_permissions`：仅访问 Notion API（https://api.notion.com/*）

所有权限都遵循最小权限原则，仅在必要时使用。

## 3. 本地存储

插件会在用户本地浏览器中保存：

- 用户提供的 Notion API Token
- 用户设定的默认 Notion 数据库 ID

所有数据仅存储在用户设备上，不会被上传或发送到其他服务器。

## 4. 第三方服务

插件仅通过 Notion 官方 API 与用户的 Notion 工作区通信，插件不会集成任何广告、分析或追踪服务。

## 5. 用户控制

用户可随时：

- 在 Chrome 扩展管理界面停用或删除插件
- 清除浏览器本地存储的数据
- 更新 Notion Token 和数据库 ID

## 6. 数据安全

- 插件仅在用户手动触发时访问数据
- 所有与 Notion 的通信均通过 HTTPS 进行加密
- 插件不在后台静默运行

## 7. 政策更新

若本隐私政策发生更改，我们将在本页面注明版本和更新日期，并提前告知用户。继续使用插件即视为用户同意更新后的政策。

## 8. 联系方式

如有任何问题，请联系插件作者：

- 📧 邮箱：linbinyoung@outlook.com
- 📂 GitHub 项目主页：https://github.com/uestcbean/phoebe