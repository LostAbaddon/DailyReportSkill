const fs = require('fs').promises;
const path = require('path');

// 获取当前时间的 YYYY-MM-DD 格式字符串
const getCurrentTimstampString = (timestamp, dateOnly=true) => {
	const now = timestamp ? new Date(timestamp) : new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	if (dateOnly) return `${year}-${month}-${day}`;
	const hour = String(now.getHours()).padStart(2, '0');
	const minute = String(now.getMinutes()).padStart(2, '0');
	const second = String(now.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};
// 读取历史
const readActionHistory = async (filePath) => {
	let content;
	try {
		content = await fs.readFile(filePath, 'utf-8');
		content = (content || '').trim();
	}
	catch (err) {
		console.error('[Utils:readActionHistory]', err);
		content = "";
	}
	return content;
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
// 将日志数据转化为 LOG 记录
const formatLogEntry = (entry) => {
	let middleEntry = "";
	if (entry.source === 'Claude Code') {
		middleEntry= `| WORKSPACE: ${entry.workspace}
| SESSIONID: ${entry.sessionId || entry.sessionid}`;
	}
	else if (entry.source === 'Chrome') {
		middleEntry= `| TABID    : ${entry.tabId || entry.tabid}`;
	}
	else if (entry.source === 'CLI') {
		middleEntry= `| PID      : ${entry.pid}`;
	}

	const dateStr = getCurrentTimstampString(entry.timestamp, false);
	return `============================================================
| SOURCE   : ${entry.source}
| TIMESTAMP: ${dateStr}
${middleEntry}
============================================================

${entry.content}`;
};
// 本地日志
const debugLog = async (message, level = 'INFO') => {
	try {
		const logDir = path.join(__dirname, "..", 'logs');
		await fs.mkdir(logDir, { recursive: true });

		const logFile = path.join(logDir, `${getCurrentTimstampString()}-${level.toLowerCase()}.log`);
		const timestamp = getCurrentTimstampString(null, false);
		const logLine = `[${timestamp}] ${message}\n`;

		await fs.appendFile(logFile, logLine, 'utf-8');
	}
	catch {}
};

module.exports = {
	getCurrentTimstampString,
	readActionHistory,
	cccoreSocket,
	formatLogEntry,
	debugLog,
};