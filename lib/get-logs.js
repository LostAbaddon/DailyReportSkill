/**
 * 获取日志查询函数库
 * 从 CCCore 获取日志记录，或从本地日志文件读取
 */

const net = require('net');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { getCurrentTimstampString, readActionHistory, cccoreSocket, formatLogEntry, debugLog } = require('./utils');

const SocketTimeout = 3000;

// 获取日志目录
let LoggerPath = process.env.ACTION_LOGGER_PATH;
if (!LoggerPath) {
	LoggerPath = path.join(os.homedir(), 'action-logger');
}

/**
 * 通过 Socket IPC 从 CCCore 获取日志
 */
const getLogsFromCCCore = (limit) => {
	return new Promise((resolve) => {
		const socketPath = cccoreSocket();
		const socket = net.createConnection(socketPath);

		socket.on('connect', () => {
			const command = {
				action: 'GET_LOGS',
				data: { limit },
			};
			socket.write(JSON.stringify(command) + '\n');
			debugLog(`连接到 CCCore socket: ${socketPath}, limit: ${limit}`);
		});
		socket.on('data', (data) => {
			try {
				const response = JSON.parse(data.toString());
				socket.destroy();
				debugLog(`从 CCCore 获取到响应: ${JSON.stringify(response)}`);
				resolve(response);
			}
			catch (error) {
				socket.destroy();
				debugLog(`解析 CCCore 响应失败: ${error.message}`, 'ERROR');
				resolve({ ok: false, error: error.message });
			}
		});
		socket.on('error', (error) => {
			socket.destroy();
			debugLog(`CCCore socket 连接错误: ${error.message}`, 'ERROR');
			resolve({ ok: false, error: error.message });
		});

		setTimeout(() => {
			socket.destroy();
			debugLog('CCCore 响应超时', 'WARN');
			resolve({ ok: false, error: 'CCCore 响应超时' });
		}, SocketTimeout);
	});
};

/**
 * 解析本地日志文件
 */
const parseLogFile = (content) => {
	if (!content) return [];

	// 按 ============================================================ 分割记录
	const records = [];
	const parts = ('\n' + content).split(/\n={20,}/);

	// 第一个元素必然是空白
	for (let idx = 1; idx < parts.length; idx += 2) {
		// 按照格式，第一块应该是元数据
		const head = (parts[idx] || '').trim().split(/\|/).map(l => l.trim()).filter(i => i);
		// 按照格式，第二块应该是 content
		const content = (parts[idx + 1] || '').trim();
		if (!content) continue;

		const log = { content };
		head.forEach(line => {
			line = line.split(':');
			const name = line.shift().trim().toLowerCase();
			if (!name) return;
			line = line.join(':').trim();
			if (!line) return;
			log[name] = line;
		});
		records.push(log);
	}

	return records;
};
/**
 * 从本地文件获取日志
 */
const getLogsFromLocalFile = async (limit) => {
	try {
		await fs.mkdir(LoggerPath, { recursive: true });
		const logFilePath = path.join(LoggerPath, getCurrentTimstampString() + '.log');
		const content = await readActionHistory(logFilePath);
		const records = parseLogFile(content);
		const logs = limit >= 0 ? records.slice(-limit).reverse() : records.reverse();

		debugLog(`从本地文件获取到 ${logs.length} 条日志`);
		return {
			ok: true,
			message: {
				count: logs.length,
				logs,
			},
		};
	}
	catch (error) {
		debugLog(`从本地文件获取日志失败: ${error.message}`, 'ERROR');
		return {
			ok: false,
			error: error.message,
		};
	}
};

/**
 * 获取日志并返回格式化后的文本
 * @param {number} limit - 要获取的日志条数，-1 表示全部
 * @returns {Promise<string>} 格式化后的日志文本
 */
const getLogs = async (limit = 5) => {
	try {
		// 先尝试从 CCCore 获取
		let result = await getLogsFromCCCore(limit);
		result.ok = false;
		if (!result.ok) {
			debugLog('从 CCCore 获取失败，尝试从本地文件获取');
			result = await getLogsFromLocalFile(limit);
		}

		if (result.ok) {
			const logs = result.message?.logs || [];
			debugLog(`成功获取 ${logs.length} 条日志`);

			const output = `最近 ${logs.length} 条日志记录:\n\n${logs.map(item => formatLogEntry(item)).join('\n\n')}`;
			return output;
		}
		else {
			const errorMsg = `获取日志记录出错：${result.error}`;
			debugLog(errorMsg, 'ERROR');
			return errorMsg;
		}
	}
	catch (error) {
		const errorMsg = `获取日志时发生错误: ${error.message}`;
		debugLog(errorMsg, 'ERROR');
		return errorMsg;
	}
};

module.exports = {
	getLogs,
};