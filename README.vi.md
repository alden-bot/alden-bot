# Alden Bot

[![CI](https://github.com/finntrannn/alden-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/finntrannn/alden-bot/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/package%20manager-npm-CB3837.svg)](https://www.npmjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6.svg)](https://www.typescriptlang.org/)

Alden Bot là một Zalo bot dựa trên thư viện zca-js. Nó giúp chuyển đổi tài khoản Zalo cá nhân thành một bot hoạt động theo cơ chế plugin, hỗ trợ sẵn commands, phân quyền (permissions), đa ngôn ngữ (i18n) và rất dễ triển khai (deploy)

> Alden Bot dùng thư viện Zalo API không chính thức và không liên quan tới Zalo. Việc dùng tài khoản cá nhân để chạy bot có thể vi phạm quy định nền tảng hoặc khiến tài khoản bị hạn chế. Nên dùng tài khoản riêng cho bot và tự cân nhắc rủi ro trước khi chạy.

English README: [README.md](README.md)

## Features

- 🔌 Hệ thống plugins có thể mở rộng
- ⚡ Commands, permissions, cooldowns và aliases
- 🧩 Stable plugin API qua `@/api`
- 🌐 Core i18n và language setting theo từng user
- 📦 Runtime dependency install cho plugins
- 🧰 Sẵn PM2, Docker, tests, lint và CI

## Requirements

- Node.js 22 trở lên.
- npm (hoặc pnpm, Yarn, hay package manager tương thích khác).
- Một tài khoản Zalo dùng để chạy bot runtime.

## Quick Start

```bash
git clone https://github.com/finntrannn/alden-bot.git
cd alden-bot
npm install
cp .env.example .env
npm start
```

Lần chạy đầu, làm theo login hoặc QR flow hiển thị trong terminal. Runtime data nằm trong `data/`, còn plugin được load từ `plugins/`.

## Environment

Copy `.env.example` thành `.env`, rồi sửa những biến bạn cần.

`BotAdmin` là Zalo user ID được khai báo trong `ADMIN_IDS`. BotAdmin là người sở hữu bot runtime và có thể dùng command đặc quyền, kể cả khi họ không phải group admin trong một chat.

| Variable                | Default | Notes                                                                        |
| ----------------------- | ------- | ---------------------------------------------------------------------------- |
| `ADMIN_IDS`             | empty   | Optional, danh sách Zalo user ID có quyền BotAdmin, cách nhau bằng dấu phẩy. |
| `BOT_PREFIX`            | `/`     | Prefix của command. Giá trị trống sẽ fallback về `/`.                        |
| `DEFAULT_LANGUAGE`      | `vi`    | Ngôn ngữ mặc định cho user mới.                                              |
| `LOG_LEVEL`             | `info`  | `debug`, `info`, `warn`, hoặc `error`. Không phân biệt hoa thường.           |
| `ENABLE_EVAL_COMMAND`   | `false` | Bật `/eval`. Chỉ bật nếu bạn tin toàn bộ BotAdmin.                           |
| `ENABLE_RELOAD_COMMAND` | `false` | Bật `/reload`. Bot chạy lâu nên ưu tiên restart thay vì reload.              |
| `REPLY_UNKNOWN_COMMAND` | `false` | Reply khi user gọi command không tồn tại.                                    |
| `MESSAGE_QUEUE_DELAY`   | `500`   | Thời gian chờ giữa các message gửi ra, tính bằng ms. Cho phép `0`.           |

Nếu `ADMIN_IDS` trống, bot vẫn chạy, nhưng command chỉ dành cho BotAdmin sẽ không dùng được cho tới khi có ít nhất một operator ID.

## Commands

| Command       | Purpose                                 | Required role |
| ------------- | --------------------------------------- | ------------- |
| `/help`       | Hiển thị command có thể dùng.           | Member        |
| `/ping`       | Kiểm tra latency của bot.               | Member        |
| `/status`     | Hiển thị runtime và system status.      | Member        |
| `/cancel`     | Hủy session đang chờ.                   | Member        |
| `/language`   | Đổi ngôn ngữ hiển thị.                  | Member        |
| `/permission` | Quản lý virtual permission trong group. | Leader        |
| `/plugins`    | Xem plugin đang được load.              | BotAdmin      |
| `/update`     | Kiểm tra hoặc cài cập nhật runtime.     | BotAdmin      |
| `/restart`    | Restart bot process.                    | BotAdmin      |
| `/reload`     | Reload plugin. Mặc định bị tắt.         | BotAdmin      |
| `/eval`       | Chạy JavaScript. Mặc định bị tắt.       | BotAdmin      |

`/eval` và `/reload` sẽ không được register nếu flag tương ứng trong `.env` chưa được set thành `true`.

## Plugins

Mỗi plugin nằm trong một folder riêng dưới `plugins/`:

```text
plugins/
  my-plugin/
    plugin.json
    index.ts
    package.json
```

`plugin.json` tối thiểu:

```json
{
	"name": "my-plugin",
	"version": "1.0.0",
	"description": "Example plugin",
	"author": "Your Name",
	"main": "index.ts",
	"depend": [],
	"softDepend": [],
	"permissions": {
		"my-plugin.command.example": 3
	}
}
```

`plugin.json` được validate theo `PluginManifest`. Plugin có manifest không hợp lệ sẽ bị skip, bot không crash.

Tác giả plugin nên import từ public API ổn định:

```ts
import { CommandBase, I18nManager, PluginBase } from '@/api';
```

Không nên deep import từ `src/...`; đó là phần internal và có thể đổi giữa các release.

Plugin i18n là manual. Runtime chỉ dùng translation riêng của plugin khi plugin code tự tạo `I18nManager`, load nó, rồi gán vào `this.i18n` trước khi register command có translation.

Plugin là code toàn quyền. Plugin có thể truy cập filesystem, network, environment variables và process API giống bot chính. Chỉ install plugin từ nguồn bạn tin.

Nếu plugin có `package.json`, Alden Bot có thể install dependency lúc runtime. Lockfile sẽ được ưu tiên nếu có; nếu không, runtime fallback sang production install.

Plugin examples và plugin docs dài hơn sẽ sống riêng khỏi runtime repository này.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f
```

Docker Compose mount `./data` cho runtime data và `./plugins` cho plugin files.

## PM2

```bash
npm install
cp .env.example .env
pm2 start ecosystem.config.cjs
pm2 logs alden-bot
pm2 save
```

Chỉ nên dùng `/restart` khi bot đang được quản lý bằng launcher, PM2 hoặc Docker.

## Development

```bash
npm run dev
npm run test
npm run verify
npm run create-plugin -- <PluginName>
```

`npm run verify` là gate local chính: lint, format check, locale parity, tests, typecheck và runtime smoke check. Nếu thích pnpm hoặc Yarn, dùng command tương đương như `pnpm run ...` hoặc `yarn ...`.

## Support

Dùng [GitHub Issues](https://github.com/finntrannn/alden-bot/issues) cho bug và câu hỏi. Pull request được welcome nếu thay đổi giữ runtime ổn định, đơn giản và thân thiện với plugin.

## License

MIT. Xem [LICENSE](LICENSE).
