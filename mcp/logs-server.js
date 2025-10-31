#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { debugLog } = require('../lib/utils.js');
const { getLogs } = require('../lib/get-logs.js');

const server = new Server(
	{
		name: 'daily-logs-server',
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
	}
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			{
				name: 'get_daily_logs',
				description: '获取用户今天的活动日志。可以指定获取最近几条，或获取全部日志，默认获取最近 5 条活动日志。',
				inputSchema: {
					type: 'object',
					properties: {
						limit: {
							type: 'number',
							description: '要获取的日志条数。5表示最近5条，-1表示获取全部日志。默认值为5。',
						},
					},
					required: [],
				},
			},
		],
	};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	if (name === 'get_daily_logs') {
		const limit = args.limit !== undefined ? args.limit : 5;

		try {
			await debugLog(`MCP 收到请求: get_daily_logs, limit: ${limit}`);
			const result = await getLogs(limit);
			await debugLog(`MCP 返回结果，长度: ${result.length}`);

			return {
				content: [
					{
						type: 'text',
						text: result,
					},
				],
			};
		}
		catch (error) {
			const errorMsg = `执行错误: ${error.message}`;
			await debugLog(errorMsg, 'ERROR');

			return {
				content: [
					{
						type: 'text',
						text: '读取活动日志出错了: ' + errorMsg,
					},
				],
			};
		}
	}

	await debugLog(`未知工具: ${name}`, 'WARN');
	return {
		content: [
			{
				type: 'text',
				text: `未知工具: ${name}`,
			},
		],
	};
});

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main();
