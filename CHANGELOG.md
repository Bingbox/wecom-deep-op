# wecom-deep-op 变更日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.1] - 2026-03-21

### 🛠️ 增强（响应同事建议）

**错误处理与可观测性**:
- 新增 `WeComError` 类，统一封装企业微信业务错误（errcode/errmsg/data）
- 新增 `Logger` 工具类，支持 `debug`/`info`/`error` 三级日志（通过 `DEBUG_LEVEL` 控制）
- 实现 `withRetry` 函数，指数退避重试（3次，1s→2s→4s），仅对网络错误和HTTP 5xx生效
- 为关键API函数添加日志（doc_get, doc_create, doc_edit, schedule_create, meeting_create, todo_create）
- 统一 `callWeComApi` 错误处理，提升生产环境可调试性

**依赖版本检查**:
- `ping` 函数增强：自动检测 `@wecom/wecom-openclaw-plugin` 是否安装且版本 ≥ v1.0.13
- `preflight_check` 增强：除了服务配置检查，现在还能发现插件缺失或版本过旧，直接给出升级命令
- 文档强化：README 和 SKILL 均明确标注插件版本要求（≥1.0.13）和安装升级步骤

---

## [1.0.0] - 2026-03-21

### ✨ 新增

- **首次发布** - 企业微信全能操作 Skill
- 统一封装 **5大服务**：
  - 📄 文档管理（doc）：创建、读取、编辑
  - 📅 日程管理（schedule）：创建、查询、更新、取消、参会人管理
  - 📹 会议管理（meeting）：预约、查询、取消、更新参会人
  - ✅ 待办管理（todo）：创建、列表、详情、状态更新、删除
  - 👥 通讯录（contact）：成员列表、本地搜索
- 基于企业微信官方插件 `@wecom/wecom-openclaw-plugin` v1.0.13
- 支持的 OpenClaw 调用方式：`wecom_mcp call wecom-deep-op.<function> '{}'`
- 内置配置检查：`ping`（健康检查）、`preflight_check`（批量配置验证）
- **智能配置引导**：每个 API 函数在配置缺失时自动返回该服务的具体配置步骤，无需预先检查
- 完整 TypeScript 类型定义
- MIT 开源协议

### 📚 文档

- 完整的 `SKILL.md` 技能说明
- 详细的 `README.md` 使用指南（含智能配置引导说明）
- API 参考手册（27个接口）
- 故障排除表格
- 安全与隐私承诺
- 发布指南（GitHub + Clawhub）

### 🔧 技术实现

- TypeScript + Node.js
- Rollup 构建（支持 CJS + ESM）
- 标准 MCP 协议封装
- 环境变量 + mcporter.json 双配置源
- 异步任务轮询支持（文档导出）
- 智能配置检查辅助函数（checkServiceConfig）

---

## [Planned] - 未来版本

- [ ] v1.1.0: 文件上传（doc_upload）
- [ ] v1.2.0: 消息发送（msg_send）
- [ ] v1.3.0: 智能表格（smartsheet）完整支持
- [ ] v2.0.0: 批量操作支持（bulk_create, bulk_update）

---

## 贡献

欢迎提交 Issue 和 PR！
