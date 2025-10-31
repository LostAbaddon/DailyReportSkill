#!/usr/bin/env node

/**
 * User Prompt Logger Hook
 * 捕获用户输入并记录到日志文件
 * 优先通过 CCCore daemon 记录，失败则降级到本地文件
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const net = require('net');

const SocketTimeout = 3000;

let ActionLoggerPath = process.env.ACTION_LOGGER_PATH;
if (!ActionLoggerPath) {
  ActionLoggerPath = path.join(os.homedir(), 'action-logger');
}
let LoggerFilePath;

// 获取当前时间的 YYYY-MM-DD 格式字符串
const getCurrentTimstampString = (timestamp, dateOnly=true) => {
  const now = timestamp ? new Date(timestamp) : new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  if (dateOnly) return `${year}-${month}-${day}`;
  const hour = String(now.getHours() + 1).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};
// 读取历史
const readActionHistory = async () => {
  let content;
  try {
    content = await fs.readFile(LoggerFilePath, 'utf-8');
    content = (content || '').trim();
  }
  catch {
    content = "";
  }
  return content;
};
// 读取标准输入
const readStdin = () => {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        const json = JSON.parse(data);
        resolve(json);
      }
      catch {
        resolve(null);
      }
    });
    process.stdin.on('error', reject);
  });
};

// 根据规则生成到 CCCore 的专用 Socket
const cccoreSocket = (socketName='cccore_socket') => {
  const platform = process.platform;

  if (platform === 'win32') {
    return `\\\\.\\pipe\\${socketName}`;
  }
  else {
    return `/tmp/${socketName}`;
  }
};
/**
 * 通过 Socket IPC 发送日志到 CCCore
 */
const sendToCCCore = (data) => {
  return new Promise((resolve) => {
    const socketPath = cccoreSocket();
    const socket = net.createConnection(socketPath);
    socket.on('connect', () => {
      const command = {
        action: 'ADD_LOG',
        data,
      };
      socket.write(JSON.stringify(command) + '\n');
    });
    socket.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        socket.destroy();
        resolve(response);
      }
      catch (error) {
        socket.destroy();
        resolve({ ok: false, error: error.message });
      }
    });
    socket.on('error', (error) => {
      socket.destroy();
      resolve({ ok: false, error: error.message });
    });

    // 5秒超时
    setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: 'CCCore 响应超时' });
    }, SocketTimeout);
  });
};

/**
 * 本地文件写入（降级方案）
 */
const writeToLocalFile = async (data) => {
  let history = await readActionHistory();

  const record = `
============================================================
| SOURCE   : ${data.source}
| TIMESTAMP: ${getCurrentTimstampString(data.timestamp, false)}
| WORKSPACE: ${data.workspace}
| SESSIONID: ${data.sessionId}
============================================================

${data.content}
    `.trim();
  if (history) {
    history = history + '\n\n' + record;
  }
  else {
    history = record;
  }
  // 更新记录
  await fs.writeFile(LoggerFilePath, history, "utf-8");
};

// 主函数
const main = async () => {
  try {
    await fs.mkdir(ActionLoggerPath, { recursive: true });
    LoggerFilePath = path.join(ActionLoggerPath, getCurrentTimstampString() + ".log");

    const input = await readStdin();
    if (!input) return process.exit(0);
    const data = {
      source: 'Claude Code',
      workspace: input.cwd,
      sessionId: input.session_id,
      timestamp: Date.now(),
      content: input.prompt,
    };

    // 优先使用 CCCore
    const ccCoreResult = await sendToCCCore(data);
    if (ccCoreResult.ok) return process.exit(0);
    throw new Error(ccCoreResult.error);

    // CCCore 不可用，降级到本地文件
    await writeToLocalFile(data);

    // 成功退出
    process.exit(0);
  }
  catch (error) {
    console.error('记录用户输入时发生错误:', error);
    process.exit(1);
  }
};

main();