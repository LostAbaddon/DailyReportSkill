#!/usr/bin/env node

/**
 * User Prompt Logger Hook
 * 捕获用户输入并记录到日志文件
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let ActionLoggerPath = process.env.ACTION_LOGGER_PATH;
if (!ActionLoggerPath) {
  ActionLoggerPath = path.join(os.homedir(), 'action-logger');
}
let LoggerFilePath;

// 获取当前时间的 YYYY-MM-DD 格式字符串
const getCurrentTimstampString = (dateOnly=true) => {
  const now = new Date();
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

// 主函数
const main = async () => {
  try {
    await fs.mkdir(ActionLoggerPath, { recursive: true });
    LoggerFilePath = path.join(ActionLoggerPath, getCurrentTimstampString() + ".log");

    const tasks = [
      readStdin(),
      readActionHistory(),
    ];
    let [input, history] = await Promise.all(tasks);
    if (!input) return;
    const record = `
============================================================
| SOURCE   : Claude Code
| TIMESTAMP: ${getCurrentTimstampString(false)}
| CWD      : ${input.cwd}
| SessionID: ${input.session_id}
============================================================

${input.prompt}
    `.trim();
    if (history) {
      history = history + '\n\n' + record;
    }
    else {
      history = record;
    }
    // 更新记录
    await fs.writeFile(LoggerFilePath, history, "utf-8");

    // 成功退出
    process.exit(0);
  }
  catch (error) {
    console.error('记录用户输入时发生错误:', error);
    process.exit(1);
  }
};

main();