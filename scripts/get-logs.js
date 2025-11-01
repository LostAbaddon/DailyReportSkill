#!/usr/bin/env node

const { getLogs } = require('../lib/get-logs');

const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 5;

getLogs(limit).then(output => {
	console.log(output);
}).catch(error => {
	console.error(`获取日志失败: ${error.message}`);
	process.exit(1);
});
