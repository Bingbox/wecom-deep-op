/**
 * wecom-deep-op - Enterprise WeChat All-in-One Skill
 *
 * This skill provides a unified interface to all WeCom (Enterprise WeChat)
 * MCP capabilities: documents, calendar/schedule, meetings, todos, and contacts.
 *
 * @package wecom-deep-op
 * @author 白小圈
 * @license MIT
 */

// ============================================================================
// Custom Error Class
// ============================================================================

/**
 * 企业微信API错误类
 * 封装企业微信返回的错误信息，提供更清晰的错误消息
 */
export class WeComError extends Error {
  public readonly errcode: number;
  public readonly errmsg: string;
  public readonly data?: any;

  constructor(message: string, errcode: number, errmsg: string, data?: any) {
    super(message);
    this.name = 'WeComError';
    this.errcode = errcode;
    this.errmsg = errmsg;
    this.data = data;
  }

  toString(): string {
    return `${this.name}: ${this.message} (errcode=${this.errcode}, errmsg=${this.errmsg})`;
  }
}

// ============================================================================
// Logger Utility
// ============================================================================

/**
 * 简单日志工具
 * 支持 debug/info/error 级别，可通过环境变量控制
 */
export class Logger {
  private prefix: string;
  private level: 'debug' | 'info' | 'error';

  constructor(service: string) {
    this.prefix = `[${service}]`;
    const envLevel = process.env.DEBUG_LEVEL || 'info';
    this.level = envLevel === 'debug' ? 'debug' : 'info';
  }

  debug(message: string, data?: any): void {
    if (this.level === 'debug') {
      console.log(`${this.prefix} DEBUG: ${message}`, data ?? '');
    }
  }

  info(message: string): void {
    console.log(`${this.prefix} INFO: ${message}`);
  }

  error(message: string, error?: any): void {
    console.error(`${this.prefix} ERROR: ${message}`, error ?? '');
  }
}

// ============================================================================
// Configuration & Constants
// ============================================================================

const WECOM_SERVICES = {
  doc: {
    basePath: '/mcp/bot/doc',
    tools: ['get_doc_content', 'create_doc', 'edit_doc_content']
  },
  schedule: {
    basePath: '/mcp/bot/schedule',
    tools: ['create', 'get', 'update', 'delete', 'list', 'add_attendee', 'remove_attendee']
  },
  meeting: {
    basePath: '/mcp/bot/meeting',
    tools: ['create', 'get', 'update_attendee', 'cancel', 'list']
  },
  todo: {
    basePath: '/mcp/bot/todo',
    tools: ['create', 'get', 'update', 'delete', 'list']
  },
  contact: {
    basePath: '/mcp/bot/contact',
    tools: ['get_userlist']
  }
} as const;

// Default timeout values (ms)
const DEFAULT_TIMEOUT = 180000; // 3 minutes
const POLL_INTERVAL = 3000; // 3 seconds for async task polling
const MAX_POLLS = 20; // Max 60 seconds wait

// ============================================================================
// Configuration Check Helper
// ============================================================================

/**
 * 检查指定服务的配置是否就绪
 * @param service - 服务名称 (doc/schedule/meeting/todo/contact)
 * @returns 配置检查结果对象
 */
function checkServiceConfig(
  service: keyof typeof WECOM_SERVICES
): { ok: boolean; instruction?: string } {
  const envVar = `WECOM_${service.toUpperCase()}_BASE_URL`;
  if (process.env[envVar]) {
    return { ok: true };
  }

  // 生成配置指引
  const instruction = `⚠️ **配置缺失**: 服务 [${service}] 的环境变量未设置。

**请选择配置方式**：

方式一：环境变量（推荐）
在终端执行：
\`\`\`bash
export ${envVar}="https://qyapi.weixin.qq.com/mcp/bot/${service}?uaKey=YOUR_UA_KEY"
\`\`\`

方式二：mcporter.json 配置文件
编辑 \`~/.openclaw/workspace/config/mcporter.json\`：
\`\`\`json
{
  "mcpServers": {
    "wecom-${service}": {
      "baseUrl": "https://qyapi.weixin.qq.com/mcp/bot/${service}?uaKey=YOUR_UA_KEY"
    }
  }
}
\`\`\`

**如何获取 uaKey**：
1. 登录企业微信管理后台
2. 进入「应用管理」→「自建应用」→ 选择你的BOT
3. 在「权限管理」中开通 MCP 权限
4. 复制对应服务的 uaKey 参数

**验证配置**：
配置完成后，运行以下命令检查：
\`wecom_mcp call wecom-deep-op.preflight_check "{}"\`

详细说明请参阅 README.md 的「安全与隐私」章节。`;

  return { ok: false, instruction };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 实现说明：
 * - 本 Skill 作为 OpenClaw 的技能插件，会被 OpenClaw 自动加载
 * - OpenClaw 会调用 skill.exportedTools 中注册的工具函数
 * - 所有工具函数都是异步的，返回标准 JSON 对象
 *
 * 配置要求：
 * - 用户需要在自己的 mcporter.json 中配置 wecom-doc / wecom-schedule / wecom-meeting / wecom-todo / wecom-contact 五个端点
 * - 或使用本 Skill 提供的统一配置端点 wecom-deep-op（如果配置了代理模式）
 *
 * 安全原则：
 * - 绝不硬编码任何 uaKey 或凭证
 * - 从环境变量或用户配置读取 endpoint 信息
 * - 所有敏感配置必须由用户自己管理
 */

export const skillMetadata = {
  name: 'wecom-deep-op',
  version: '1.0.0',
  description: '企业微信全能操作Skill - 统一封装文档、日程、会议、待办、通讯录',
  author: '白小圈',
  license: 'MIT'
};

/**
 * 获取企业微信 MCP 服务的 baseUrl
 * 优先级：环境变量 > 配置文件（本Skill不负责配置文件读取，由OpenClaw运行时注入）
 */
function getServiceUrl(service: keyof typeof WECOM_SERVICES): string {
  // 在 OpenClaw Skill 中，配置通过 runtime context 传递
  // 这里使用环境变量作为 fallback（仅用于开发测试）
  const envVar = `WECOM_${service.toUpperCase()}_BASE_URL`;
  const url = process.env[envVar];

  if (!url) {
    throw new Error(
      `Missing configuration for ${service}. ` +
      `Set environment variable ${envVar} or configure in OpenClaw. ` +
      `Example: https://qyapi.weixin.qq.com/mcp/bot/${service}?uaKey=YOUR_KEY`
    );
  }

  return url;
}

/**
 * 智能重试函数（指数退避）
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // 如果不是网络错误或业务错误（非0），不重试
      if (error instanceof WeComError) {
        // 业务错误（errcode != 0）直接抛出
        throw error;
      }

      if (i === maxRetries - 1) break;

      // 指数退避等待
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 执行 HTTP 请求到企业微信 MCP 端点（带重试）
 */
async function callWeComApi(
  service: keyof typeof WECOM_SERVICES,
  tool: string,
  params: Record<string, any> = {},
  logger?: Logger
): Promise<Record<string, any>> {
  const baseUrl = getServiceUrl(service);
  const url = `${baseUrl}/${tool}`;

  const makeRequest = async () => {
    logger?.debug(`${service}.${tool}`, params);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = (await response.json()) as any; // 明确声明为any

    if (!response.ok || data.errcode !== 0) {
      const errmsg = data.errmsg || `HTTP ${response.status}`;
      logger?.error(`${service}.${tool} failed`, { errcode: data.errcode, errmsg });

      if (data.errcode !== 0) {
        // 业务错误，抛出WeComError（不重试）
        throw new WeComError(
          `企业微信API错误: ${errmsg}`,
          data.errcode,
          errmsg,
          data
        );
      } else {
        // HTTP错误，可重试
        throw new Error(`${response.status}: ${errmsg}`);
      }
    }

    logger?.debug(`${service}.${tool} success`);
    return data;
  };

  return await withRetry(makeRequest, 3, 1000);
}

/**
 * 轮询异步任务（用于文档导出等长时间操作）
 */
async function pollTask(
  service: keyof typeof WECOM_SERVICES,
  taskId: string,
  docid?: string
): Promise<Record<string, any>> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const params: Record<string, any> = { task_id: taskId };
    if (docid) params.docid = docid;
    if (service === 'doc') params.type = 2; // 导出类型：Markdown

    const result = await callWeComApi(service, 'get_doc_content', params);

    if (result.task_done) {
      return result;
    }

    // 未完成，等待后重试
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error(`Task ${taskId} timed out after ${MAX_POLLS * POLL_INTERVAL}ms`);
}

// ============================================================================
// Document Operations (doc_*)
// ============================================================================

/**
 * 导出/获取文档内容
 * @param docid - 文档ID，或提供 url
 * @param type - 导出类型，固定为 2 (Markdown)
 * @param task_id - 如果有，表示轮询
 */
export async function doc_get(
  docid?: string,
  url?: string,
  task_id?: string
): Promise<Record<string, any>> {
  const logger = new Logger('doc');
  logger.debug('doc_get called', { docid, url, task_id });

  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('doc');
  if (!configCheck.ok) {
    logger.warn('Configuration missing for doc service');
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'doc',
        instruction: configCheck.instruction
      }
    };
  }

  if (!docid && !url) {
    const err = 'doc_get requires either docid or url';
    logger.error(err);
    throw new Error(err);
  }

  const params: Record<string, any> = { type: 2 };
  if (docid) params.docid = docid;
  if (url) params.url = url;
  if (task_id) params.task_id = task_id;

  const result = await callWeComApi('doc', 'get_doc_content', params, logger);

  // 如果任务未完成，需要轮询（OpenClaw不会自动轮询，这里返回task_id供后续调用）
  if (!result.task_done && !task_id) {
    logger.info('Task started, polling required', { task_id: result.task_id });
    return {
      errcode: 0,
      errmsg: 'ok',
      task_id: result.task_id,
      task_done: false,
      message: 'Task started, poll with task_id to get result'
    };
  }

  // 如果返回了 task_done 但没内容，可能是轮询中，返回 task_id
  if (result.task_done && !result.content && !task_id) {
    logger.info('Task done but no content yet, polling again', { task_id: result.task_id });
    return {
      errcode: 0,
      errmsg: 'ok',
      task_id: result.task_id,
      task_done: false
    };
  }

  logger.debug('doc_get success');
  return result;
}

/**
 * 创建文档
 * @param doc_type - 文档类型：3=文档，10=智能表格
 * @param doc_name - 文档名称
 */
export async function doc_create(
  doc_type: number,
  doc_name: string
): Promise<Record<string, any>> {
  const logger = new Logger('doc');

  logger.info('Creating document', { doc_type, doc_name });

  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('doc');
  if (!configCheck.ok) {
    logger.warn('Configuration missing for doc service');
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'doc',
        instruction: configCheck.instruction
      }
    };
  }

  const result = await callWeComApi('doc', 'create_doc', {
    doc_type,
    doc_name
  }, logger);

  logger.info('Document created successfully', { docid: result.docid });
  return result;
}

/**
 * 编辑/覆写文档内容
 * @param docid - 文档ID
 * @param content - Markdown内容
 * @param content_type - 内容类型，固定为 1 (Markdown)
 */
export async function doc_edit(
  docid: string,
  content: string,
  content_type: number = 1
): Promise<Record<string, any>> {
  const logger = new Logger('doc');
  logger.info('Editing document', { docid, content_length: content.length });

  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('doc');
  if (!configCheck.ok) {
    logger.warn('Configuration missing for doc service');
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'doc',
        instruction: configCheck.instruction
      }
    };
  }

  const result = await callWeComApi('doc', 'edit_doc_content', {
    docid,
    content,
    content_type
  }, logger);

  logger.info('Document edited successfully', { docid });
  return result;
}

// ============================================================================
// Schedule Operations (schedule_*)
// ============================================================================

/**
 * 创建日程
 */
export async function schedule_create(
  params: {
    summary: string;
    start_time: string; // ISO 8601 or "YYYY-MM-DD HH:mm:ss"
    end_time: string;
    location?: string;
    description?: string;
    attendees?: string[]; // userid list
    reminders?: Array<{ type: number; minutes: number }>; // 提醒规则
  }
): Promise<Record<string, any>> {
  const logger = new Logger('schedule');
  logger.info('Creating schedule', { summary: params.summary, start_time: params.start_time });

  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('schedule');
  if (!configCheck.ok) {
    logger.warn('Configuration missing for schedule service');
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'schedule',
        instruction: configCheck.instruction
      }
    };
  }

  const result = await callWeComApi('schedule', 'create', params, logger);
  logger.info('Schedule created successfully', { schedule_id: result.scheduleid });
  return result;
}

/**
 * 查询日程
 */
export async function schedule_list(
  start_time: string,
  end_time: string,
  // 其他可选筛选参数...
  params: Record<string, any> = {}
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('schedule');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'schedule',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('schedule', 'list', {
    start_time,
    end_time,
    ...params
  });
}

/**
 * 获取日程详情
 */
export async function schedule_get(schedule_id: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('schedule');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'schedule',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('schedule', 'get', { schedule_id });
}

/**
 * 更新日程
 */
export async function schedule_update(
  schedule_id: string,
  updates: Partial<{
    summary: string;
    start_time: string;
    end_time: string;
    location: string;
    description: string;
  }>
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('schedule');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'schedule',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('schedule', 'update', {
    schedule_id,
    ...updates
  });
}

/**
 * 取消日程
 */
export async function schedule_cancel(schedule_id: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('schedule');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'schedule',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('schedule', 'delete', { schedule_id });
}

/**
 * 添加参会人
 */
export async function schedule_add_attendee(
  schedule_id: string,
  attendee_userids: string[]
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('schedule');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'schedule',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('schedule', 'add_attendee', {
    schedule_id,
    attendee_userids
  });
}

/**
 * 移除参会人
 */
export async function schedule_remove_attendee(
  schedule_id: string,
  attendee_userids: string[]
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('schedule');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'schedule',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('schedule', 'remove_attendee', {
    schedule_id,
    attendee_userids
  });
}

// ============================================================================
// Meeting Operations (meeting_*)
// ============================================================================

/**
 * 创建/预约会议
 */
export async function meeting_create(
  params: {
    subject: string;
    start_time: string;
    end_time: string;
    type?: number; // 会议类型：1=立即会议，2=预约会议，3=周期性会议
    attendees?: string[]; // userid list
    agenda?: string;
    media_conf_id?: string; // 媒体会议ID
    meeting_room_id?: string; // 会议室ID
  }
): Promise<Record<string, any>> {
  const logger = new Logger('meeting');
  logger.info('Creating meeting', { subject: params.subject, start_time: params.start_time });

  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('meeting');
  if (!configCheck.ok) {
    logger.warn('Configuration missing for meeting service');
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'meeting',
        instruction: configCheck.instruction
      }
    };
  }

  const result = await callWeComApi('meeting', 'create', params, logger);
  logger.info('Meeting created successfully', { meeting_id: result.meetingid });
  return result;
}

/**
 * 查询会议列表
 */
export async function meeting_list(
  start_time: string,
  end_time: string,
  params: Record<string, any> = {}
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('meeting');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'meeting',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('meeting', 'list', {
    start_time,
    end_time,
    ...params
  });
}

/**
 * 获取会议详情
 */
export async function meeting_get(meeting_id: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('meeting');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'meeting',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('meeting', 'get', { meeting_id });
}

/**
 * 取消会议
 */
export async function meeting_cancel(meeting_id: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('meeting');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'meeting',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('meeting', 'cancel', { meeting_id });
}

/**
 * 更新会议参会人
 */
export async function meeting_update_attendees(
  meeting_id: string,
  add_attendees?: string[],
  remove_attendees?: string[]
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('meeting');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'meeting',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('meeting', 'update_attendee', {
    meeting_id,
    add_attendees,
    remove_attendees
  });
}

// ============================================================================
// Todo Operations (todo_*)
// ============================================================================

/**
 * 创建待办
 */
export async function todo_create(
  params: {
    title: string;
    due_time?: string; // 截止时间
    priority?: number; // 1=高, 2=中, 3=低
    desc?: string; // 描述
    receivers?: string[]; // 分派人 userid list
    creator?: string; // 创建人 userid
  }
): Promise<Record<string, any>> {
  const logger = new Logger('todo');
  logger.info('Creating todo', { title: params.title, priority: params.priority });

  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    logger.warn('Configuration missing for todo service');
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  const result = await callWeComApi('todo', 'create', params, logger);
  logger.info('Todo created successfully', { todo_id: result.todo_id });
  return result;
}

/**
 * 获取待办列表
 */
export async function todo_list(
  status?: number, // 0=未开始, 1=进行中, 2=完成
  limit?: number,
  offset?: number
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('todo', 'list', {
    status,
    limit,
    offset
  });
}

/**
 * 获取待办详情
 */
export async function todo_get(todo_id: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('todo', 'get', { todo_id });
}

/**
 * 更新待办状态
 */
export async function todo_update_status(
  todo_id: string,
  status: 0 | 1 | 2
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('todo', 'update', {
    todo_id,
    status
  });
}

/**
 * 更新待办内容
 */
export async function todo_update(
  todo_id: string,
  updates: Partial<{
    title: string;
    due_time: string;
    priority: number;
    desc: string;
  }>
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('todo', 'update', {
    todo_id,
    ...updates
  });
}

/**
 * 删除待办
 */
export async function todo_delete(todo_id: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('todo', 'delete', { todo_id });
}

/**
 * 接收待办
 */
export async function todo_accept(todo_id: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('todo', 'accept', { todo_id });
}

/**
 * 拒绝待办
 */
export async function todo_refuse(
  todo_id: string,
  reason?: string
): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('todo');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'todo',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('todo', 'refuse', {
    todo_id,
    reason
  });
}

// ============================================================================
// Contact Operations (contact_*)
// ============================================================================

/**
 * 获取通讯录成员列表（当前用户可见范围）
 * ⚠️ 限制：只返回当前用户**可见范围内**的成员（通常≤100人，建议≤10人使用）
 */
export async function contact_get_userlist(): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('contact');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'contact',
        instruction: configCheck.instruction
      }
    };
  }

  return await callWeComApi('contact', 'get_userlist', {});
}

/**
 * 搜索成员（本地筛选）
 * 说明：企业微信MCP不支持服务端搜索，本函数获取全量后本地过滤
 */
export async function contact_search(keyword: string): Promise<Record<string, any>> {
  // 🔍 智能配置检查
  const configCheck = checkServiceConfig('contact');
  if (!configCheck.ok) {
    return {
      errcode: 1,
      errmsg: 'configuration_missing',
      data: {
        service: 'contact',
        instruction: configCheck.instruction
      }
    };
  }

  const result = await callWeComApi('contact', 'get_userlist', {});

  if (result.errcode !== 0) {
    return result;
  }

  const allUsers = result.userlist || [];
  const matched = allUsers.filter(
    (u: { userid: string; name: string; alias: string }) =>
      u.name.includes(keyword) ||
      (u.alias && u.alias.includes(keyword))
  );

  return {
    errcode: 0,
    errmsg: 'ok',
    total: allUsers.length,
    matched_count: matched.length,
    userlist: matched
  };
}

// ============================================================================
// Utility / Preflight
// ============================================================================

/**
 * 健康检查/就绪探测
 * 用于验证 skill 加载和配置是否正确
 */
export async function ping(): Promise<Record<string, any>> {
  // 检查环境变量配置（开发模式）
  const configuredServices = (Object.keys(WECOM_SERVICES) as Array<keyof typeof WECOM_SERVICES>)
    .filter(svc => process.env[`WECOM_${svc.toUpperCase()}_BASE_URL`])
    .map(svc => ({ service: svc, status: 'configured' }));

  return {
    errcode: 0,
    errmsg: 'ok',
    data: {
      service: 'wecom-deep-op',
      version: skillMetadata.version,
      status: 'healthy',
      configured_services: configuredServices,
      notice: 'This skill requires mcporter.json configuration or environment variables for each service endpoint.'
    }
  };
}

/**
 * 前置条件检查（Preflight）
 * 验证配置是否完整，如缺失则提供修复建议
 */
export async function preflight_check(): Promise<Record<string, any>> {
  const missing: string[] = [];
  const present: string[] = [];

  for (const service of Object.keys(WECOM_SERVICES) as Array<keyof typeof WECOM_SERVICES>) {
    const envVar = `WECOM_${service.toUpperCase()}_BASE_URL`;
    if (process.env[envVar]) {
      present.push(service);
    } else {
      missing.push(service);
    }
  }

  if (missing.length === 0) {
    return {
      errcode: 0,
      errmsg: 'ok',
      data: {
        status: 'ready',
        configured_services: present,
        message: 'All WeCom services are configured via environment variables.'
      }
    };
  }

  // 有缺失配置
  return {
    errcode: 1,
    errmsg: 'incomplete_configuration',
    data: {
      status: 'incomplete',
      configured_services: present,
      missing_services: missing,
      instruction: `Set environment variables for missing services in mcporter.json or shell profile:
${missing.map(s => `  - WECOM_${s.toUpperCase()}_BASE_URL=https://qyapi.weixin.qq.com/mcp/bot/${s}?uaKey=YOUR_UA_KEY`).join('\n')}
`
    }
  };
}

// ============================================================================
// OpenClaw Skill Exports
// ============================================================================

/**
 * OpenClaw 加载 Skill 时调用，返回所有可用工具
 */
export const exportedTools = {
  // Documents
  'doc_get': doc_get,
  'doc_create': doc_create,
  'doc_edit': doc_edit,

  // Schedules
  'schedule_create': schedule_create,
  'schedule_list': schedule_list,
  'schedule_get': schedule_get,
  'schedule_update': schedule_update,
  'schedule_cancel': schedule_cancel,
  'schedule_add_attendee': schedule_add_attendee,
  'schedule_remove_attendee': schedule_remove_attendee,

  // Meetings
  'meeting_create': meeting_create,
  'meeting_list': meeting_list,
  'meeting_get': meeting_get,
  'meeting_cancel': meeting_cancel,
  'meeting_update_attendees': meeting_update_attendees,

  // Todos
  'todo_create': todo_create,
  'todo_list': todo_list,
  'todo_get': todo_get,
  'todo_update_status': todo_update_status,
  'todo_update': todo_update,
  'todo_delete': todo_delete,
  'todo_accept': todo_accept,
  'todo_refuse': todo_refuse,

  // Contacts
  'contact_get_userlist': contact_get_userlist,
  'contact_search': contact_search,

  // Utilities
  'ping': ping,
  'preflight_check': preflight_check
};

/**
 * Default export (for CommonJS compatibility)
 */
export default exportedTools;