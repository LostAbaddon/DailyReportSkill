# Daily Report Skill

自动记录用户在 Claude Code 中的活动，为日报和周报生成提供原始数据支持。

## 功能特性

- ✅ **自动活动捕获**：在每次提交 Prompt 时自动记录
- ✅ **结构化日志**：记录 SessionID、工作目录、Prompt 内容
- ✅ **按日期组织**：自动按 `YYYY-MM-DD` 生成日志文件
- ✅ **可配置存储路径**：支持自定义日志存储位置
- ✅ **非阻塞处理**：日志记录作为后台 Hook 独立运行

## 系统要求

### Node.js
- Node.js 14.0.0 或更高版本

## 安装步骤

### 步骤 1：安装插件

如果使用本地市场：

```bash
# 在你的 marketplace.json 中添加：
{
  "name": "my-marketplace",
  "owner": {"name": "Your Name"},
  "plugins": [
    {
      "name": "daily-report",
      "source": "./path/to/DailyReportSkill"
    }
  ]
}

# 然后安装：
claude plugin install daily-report@my-marketplace
```

或者直接复制到插件目录：

```bash
cp -r . ~/.claude/plugins/daily-report
```

### 步骤 2：信任工作目录

为了让 Hook 正常工作，需要将当前工作目录设为"可信"的。启动 Claude Code 时会弹出信任提示，选择"信任"即可。

如果错过了信任提示，可以编辑 `~/.claude/claude.json` 文件，找到对应工作目录的配置，将 `hasTrustDialogAccepted` 字段设置为 `true`。

### 步骤 3：重启 Claude Code

重启 Claude Code 后插件即可使用。

## Hook 说明

本插件会自动注册一个 Hook，在以下事件触发时执行：

- **UserPromptSubmit**：用户每次提交 Prompt 后执行日志记录
  - 读取标准输入（包含 session_id、cwd、prompt）
  - 追加写入到当天的日志文件
  - 非阻塞运行，不影响主流程

**注意**：Hook 只有在工作目录被设为"可信"的情况下才能正常启动。

## 配置

### 日志存储位置

默认日志存储在 `~/.action-logger/` 目录下，按日期生成 `.log` 文件。

可通过设置环境变量 `ACTION_LOGGER_PATH` 自定义存储位置：

```bash
export ACTION_LOGGER_PATH=/your/custom/path
```

设置后重启 Claude Code，日志将写入新的位置。

## 日志格式

每条记录的格式如下：

```
============================================================
| SOURCE   : Claude Code
| TIMESTAMP: YYYY-MM-DD HH:MM:SS
| CWD      : /current/working/directory
| SessionID: {session_id}
============================================================
{user_prompt_content}
```

多条记录之间空两行分隔。

## 使用场景

### 场景 1：每日工作总结

自动记录一整天的所有活动，便于生成日报：

```
~/action-logger/2025-10-30.log
```

### 场景 2：周报统计

合并整周的日志文件，分析工作量和进度。

### 场景 3：活动审计

为工作内容保存完整的时间戳和内容记录。

## 数据隐私

- 日志仅存储在本地机器
- 包含 Prompt 全文，请注意敏感信息
- 建议定期备份或清理旧日志
- 可通过环境变量自定义存储路径以符合企业数据治理要求

## 许可证

[MIT](./LICENSE)

---

## Marketplace

本项目已上架至[自建 Marketplace](https://github.com/lostabaddon/CCMarketplace)，其中还会不断更新和上架更多 Plugin，敬请期待！

---

## 版本信息

**版本**：1.0.0
**最后更新**：2025-10-30
**功能完整性**：初始版本，核心功能已实现

**主要功能**：
- ✅ 自动捕获用户 Prompt
- ✅ 按日期结构化存储
- ✅ 可配置存储路径
- ✅ Hook 集成（UserPromptSubmit 事件）
- ✅ 非阻塞后台处理
