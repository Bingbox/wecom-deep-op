# wecom-deep-op - 企业微信全能操作 Skill

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-blue)](https://openclaw.ai)
[![Enterprise WeChat](https://img.shields.io/badge/Enterprise-WeChat-07C160)](https://work.weixin.qq.com/)

> **一站式企业微信自动化解决方案** - 统一封装文档、日历、会议、待办、通讯录所有企业微信MCP能力

---

## 📖 目录

- [✨ 特性](#-特性)
- [🚀 快速开始](#-快速开始)
- [📚 API 参考](#-api-参考)
- [🔐 安全与隐私](#-安全与隐私)
- [📦 安装与发布](#-安装与发布)
- [🛠️ 开发](#️-开发)
- [🐛 故障排除](#-故障排除)

---

## ✨ 特性

| 特性 | 描述 |
|------|------|
| **统一接口** | 5大服务（文档/日程/会议/待办/通讯录）一个Skill搞定 |
| **完整功能** | 基于企业微信官方 MCP API 封装，功能全覆盖 |
| **生产就绪** | 基于 `@wecom/wecom-openclaw-plugin` v1.0.13 构建 |
| **安全设计** | 不存储任何token，配置完全由用户控制 |
| **TypeScript** | 完整的类型定义，开发体验优秀 |
| **MIT协议** | 自由使用、修改、分发 |

---

## 🚀 快速开始

### 前置条件

- ✅ OpenClaw 已安装（推荐 v0.5.0+）
- ✅ Node.js 18+ 环境
- ✅ 企业微信管理员已创建 BOT 并配置 MCP 权限
- ✅ 已安装官方插件 `@wecom/wecom-openclaw-plugin`

### 1. 安装 Skill

**从 Clawhub（推荐）：**
```bash
clawhub install wecom-deep-op
```

**本地开发安装：**
```bash
cd skills/wecom-deep-op
npm install
npm run build
```

### 2. 配置企业微信 BOT

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 进入「应用管理」→ 「自建应用」→ 选择你的 BOT 应用
3. 在「权限管理」中开通以下 **MCP 权限**：
   - 📄 文档管理（读写权限）
   - 📅 日程管理（读写权限）
   - 📹 会议管理（创建/查询/取消）
   - ✅ 待办事项（读写权限）
   - 👥 通讯录查看（受限范围）
4. 保存后，复制每个服务对应的 `uaKey`（在 MCP 设置页面可见）

### 3. 配置 OpenClaw

编辑 `~/.openclaw/workspace/config/mcporter.json`：

```json
{
  "mcpServers": {
    "wecom-deep-op": {
      "baseUrl": "https://qyapi.weixin.qq.com/mcp/bot/combined?uaKey=YOUR_COMBINED_KEY"
    }
  }
}
```

**注意：** 如果你的企业微信 BOT 为每个服务分配了不同的 `uaKey`，也可以分别配置：

```json
{
  "mcpServers": {
    "wecom-doc": { "baseUrl": "https://.../mcp/bot/doc?uaKey=KEY_DOC" },
    "wecom-schedule": { "baseUrl": "https://.../mcp/bot/schedule?uaKey=KEY_SCHEDULE" },
    "wecom-meeting": { "baseUrl": "https://.../mcp/bot/meeting?uaKey=KEY_MEETING" },
    "wecom-todo": { "baseUrl": "https://.../mcp/bot/todo?uaKey=KEY_TODO" },
    "wecom-contact": { "baseUrl": "https://.../mcp/bot/contact?uaKey=KEY_CONTACT" }
  }
}
```

本 Skill 会按顺序读取以下配置源：
1. 环境变量 `WECOM_*_BASE_URL`
2. `mcporter.json` 中的配置（通过 OpenClaw 运行时注入）
3. 如果都没配置，会报错提示

### Step 3: 智能配置检查（可选但推荐）

运行 `preflight_check` 检查所有服务配置是否完整：

```bash
wecom_mcp call wecom-deep-op.preflight_check "{}"
```

如果配置缺失，会返回详细的修复指引。例如：

```json
{
  "errcode": 1,
  "data": {
    "missing_services": ["doc", "schedule"],
    "instruction": "Set environment variables for missing services..."
  }
}
```

### Step 4: 自动配置引导

**无需预先检查**！当你第一次调用任何API时，如果该服务未配置，Skill 会**自动返回该服务的具体配置步骤**。

例如，调用创建文档但未配置 `doc` 服务时：
```bash
wecom_mcp call wecom-deep-op.doc_create '{"doc_type": 3, "doc_name": "xxx"}'
```

会返回包含完整配置指引的错误信息，包括：
- 环境变量设置方法
- mcporter.json 配置示例
- 如何获取 uaKey
- 验证配置的命令

按照指引完成配置后，即可正常使用。

### 5. 测试连接

```bash
# 验证 Skill 加载和配置
wecom_mcp call wecom-deep-op.ping "{}"

# 预期返回
{
  "errcode": 0,
  "data": {
    "service": "wecom-deep-op",
    "version": "1.0.0",
    "status": "healthy"
  }
}

# 检查前置条件
wecom_mcp call wecom-deep-op.preflight_check "{}"
```

---

## 📚 API 参考

所有调用格式：

```bash
wecom_mcp call wecom-deep-op.<function_name> '<json_params>'
```

### 文档管理

#### 创建文档
```bash
wecom_mcp call wecom-deep-op.doc_create '{
  "doc_type": 3,
  "doc_name": "项目周报"
}'
```
**返回：**
```json
{
  "errcode": 0,
  "docid": "dc123...",
  "url": "https://doc.weixin.qq.com/doc/..."
}
```

#### 读取文档（异步轮询）
```bash
# 第一步：启动导出任务
wecom_mcp call wecom-deep-op.doc_get '{
  "docid": "DOCID"
}'
# 返回 { "task_done": false, "task_id": "task_123" }

# 第二步：轮询结果（每3秒一次，最多20次）
wecom_mcp call wecom-deep-op.doc_get '{
  "docid": "DOCID",
  "task_id": "task_123"
}'
# 最终返回 { "task_done": true, "content": "# Markdown 内容..." }
```

#### 编辑文档
```bash
wecom_mcp call wecom-deep-op.doc_edit '{
  "docid": "DOCID",
  "content": "# 新标题\n\n新内容",
  "content_type": 1
}'
```

---

### 日程管理

#### 创建日程
```bash
wecom_mcp call wecom-deep-op.schedule_create '{
  "summary": "项目评审会",
  "start_time": "2026-03-22 14:00:00",
  "end_time": "2026-03-22 16:00:00",
  "location": "会议室A",
  "description": "讨论Q1进展",
  "attendees": ["zhangsan", "lisi"],
  "reminders": [
    { "type": 1, "minutes": 15 }  // 会议前15分钟提醒
  ]
}'
```

#### 查询某时段日程
```bash
wecom_mcp call wecom-deep-op.schedule_list '{
  "start_time": "2026-03-21 00:00:00",
  "end_time": "2026-03-22 00:00:00"
}'
```

#### 更新日程
```bash
wecom_mcp call wecom-deep-op.schedule_update '{
  "schedule_id": "schedule_xxx",
  "summary": "新的会议标题",
  "start_time": "2026-03-22 15:00:00"
}'
```

#### 取消日程
```bash
wecom_mcp call wecom-deep-op.schedule_cancel '{"schedule_id": "schedule_xxx"}'
```

---

### 会议管理

#### 预约会议
```bash
wecom_mcp call wecom-deep-op.meeting_create '{
  "subject": "周会",
  "start_time": "2026-03-22 10:00:00",
  "end_time": "2026-03-22 11:00:00",
  "type": 2,
  "attendees": ["zhangsan", "lisi"],
  "agenda": "1. 上周回顾 2. 本周计划"
}'
```

#### 查询会议
```bash
wecom_mcp call wecom-deep-op.meeting_list '{
  "start_time": "2026-03-21 00:00:00",
  "end_time": "2026-03-22 00:00:00"
}'
```

#### 更新参会人
```bash
wecom_mcp call wecom-deep-op.meeting_update_attendees '{
  "meeting_id": "meeting_xxx",
  "add_attendees": ["wangwu"],
  "remove_attendees": ["lisi"]
}'
```

#### 取消会议
```bash
wecom_mcp call wecom-deep-op.meeting_cancel '{"meeting_id": "meeting_xxx"}'
```

---

### 待办管理

#### 创建待办
```bash
wecom_mcp call wecom-deep-op.todo_create '{
  "title": "审核合同",
  "due_time": "2026-03-23 18:00:00",
  "priority": 2,
  "desc": "请审核附件合同并反馈",
  "receivers": ["zhangsan"]
}'
```

#### 获取待办列表
```bash
wecom_mcp call wecom-deep-op.todo_list '{
  "status": 0,      // 0=未开始, 1=进行中, 2=完成
  "limit": 50,
  "offset": 0
}'
```

#### 更新待办状态
```bash
# 标记为完成
wecom_mcp call wecom-deep-op.todo_update_status '{
  "todo_id": "todo_xxx",
  "status": 2
}'
```

#### 删除待办
```bash
wecom_mcp call wecom-deep-op.todo_delete '{"todo_id": "todo_xxx"}'
```

---

### 通讯录

#### 获取成员列表（当前用户可见范围）
```bash
wecom_mcp call wecom-deep-op.contact_get_userlist '{}'
```
⚠️ **限制**：只返回当前 BOT 可见范围内的成员（通常≤100人，建议≤10人使用）

#### 搜索成员
```bash
wecom_mcp call wecom-deep-op.contact_search '{"keyword": "张三"}'
```
说明：内部会先获取全量可见成员，再本地筛选。

---

## 🔐 安全与隐私

### 本 Skill 的安全承诺

- ❌ **绝不**存储任何企业微信 access_token、uaKey 或其他凭证
- ❌ **绝不**将你的配置上传到任何云端
- ❌ **绝不**记录你调用的业务数据（除调试日志外）
- ✅ 所有敏感配置必须由用户自己在本地环境管理
- ✅ 遵循最小权限原则，建议使用专用 BOT 账户

### 配置安全建议

#### 方法1：环境变量（推荐）
```bash
# 在 ~/.bashrc 或 ~/.profile 中
export WECOM_DOC_BASE_URL="https://...?uaKey=YOUR_KEY"
export WECOM_SCHEDULE_BASE_URL="https://...?uaKey=YOUR_KEY"
export WECOM_MEETING_BASE_URL="https://...?uaKey=YOUR_KEY"
export WECOM_TODO_BASE_URL="https://...?uaKey=YOUR_KEY"
export WECOM_CONTACT_BASE_URL="https://...?uaKey=YOUR_KEY"
```

#### 方法2：mcporter.json（确保文件权限 600）
```json
{
  "mcpServers": {
    "wecom-doc": { "baseUrl": "https://.../doc?uaKey=YOUR_KEY" },
    "wecom-schedule": { "baseUrl": "https://.../schedule?uaKey=YOUR_KEY" },
    "wecom-meeting": { "baseUrl": "https://.../meeting?uaKey=YOUR_KEY" },
    "wecom-todo": { "baseUrl": "https://.../todo?uaKey=YOUR_KEY" },
    "wecom-contact": { "baseUrl": "https://.../contact?uaKey=YOUR_KEY" }
  }
}
```

**严禁**：
- 将 `uaKey` 提交到 Git 公开仓库
- 在脚本或注释中硬编码密钥
- 通过不安全渠道传输密钥

---

## 📦 安装与发布

### 发布到 Clawhub

1. **准备发布文件**
   - 确保 `skill.yml` 元数据完整
   - 更新 `CHANGELOG.md`
   - 确保 `LICENSE` 文件存在
   - 提交所有更改到 Git

2. **注册 Clawhub 账号**
```bash
clawhub login
# 按提示输入 API Token（在 Clawhub Settings 获取）
```

3. **dry-run 预览**
```bash
clawhub publish . --dry-run
```

4. **正式发布**
```bash
clawhub publish . --tag latest
```

5. **验证**
```bash
clawhub info wecom-deep-op
```

**发布检查清单**：
- [ ] `skill.yml` 包含所有必需字段（name, version, description, author, license）
- [ ] `README.md` 完整（安装、配置、使用示例）
- [ ] `CHANGELOG.md` 有本次更新记录
- [ ] `package.json` dependencies 无敏感信息
- [ ] 所有文档中 `uaKey` 示例已替换为占位符
- [ ] 构建产物（`dist/`）已包含在发布包中（`.clawhubignore` 控制）

---

### 安装到 OpenClaw

**从 Clawhub：**
```bash
clawhub install wecom-deep-op
```

**本地路径：**
```bash
openclaw skill add ./skills/wecom-deep-op
```

---

## 🛠️ 开发

### 项目结构

```
wecom-deep-op/
├── src/
│   └── index.ts         # 主实现文件
├── dist/                # 构建输出（自动生成）
│   ├── index.cjs.js     # CommonJS
│   ├── index.esm.js     # ES Module
│   └── index.d.ts       # TypeScript 类型
├── examples/            # 使用示例（可选）
│   ├── create-doc.ts
│   └── schedule-meeting.ts
├── test/                # 测试文件（可选）
├── skill.yml            # Clawhub 元数据
├── package.json
├── tsconfig.json
├── rollup.config.js
├── README.md            # 本文件
├── CHANGELOG.md
└── LICENSE
```

### 本地开发

```bash
# 安装依赖
npm install

# 开发模式（监听热重载）
npm run dev

# 构建
npm run build

# Lint
npm run lint

# 格式化
npm run format

# 测试（需要配置真实UA_KEY）
npm test
```

### 添加新功能

1. 在 `src/index.ts` 中添加新函数
2. 函数必须 `async` 并返回 `Promise<Record<string, any>>`
3. 将函数名添加到 `exportedTools` 映射
4. 在 `README.md` 的 API 参考部分添加文档
5. 更新 `CHANGELOG.md`

---

## 🐛 故障排除

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| `Unknown MCP server` | 未配置 mcporter.json | 检查配置路径，重启 OpenClaw |
| `errcode=60001` | access_token 失效 | 在企微后台重新授权 BOT |
| `Missing configuration` | 环境变量未设置 | 设置 `WECOM_*_BASE_URL` 环境变量 |
| `Task timeout` | 文档太大导出慢 | 增加 `MAX_POLLS` 或分卷导出 |
| `>10 users returned` | BOT 通讯录权限过大 | 联系管理员缩小 BOT 可见范围 |
| `HTTP 4xx/5xx` | 参数错误或服务端问题 | 检查参数格式，查看企业微信官方文档 |

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- 基于 **[腾讯企业微信官方 OpenClaw 插件](https://github.com/WecomTeam/wecom-openclaw-plugin)** (`@wecom/wecom-openclaw-plugin` v1.0.13) 构建
- 感谢企业微信团队提供的优秀 MCP 接口
- 本 Skill 为社区维护，不属于官方产品

---

**版本**: 1.0.0  
**最后更新**: 2026-03-21  
**维护者**: 白小圈
