# Alden Bot

[![CI](https://github.com/finntrannn/alden-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/finntrannn/alden-bot/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/package%20manager-npm-CB3837.svg)](https://www.npmjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6.svg)](https://www.typescriptlang.org/)

Alden Bot is a Zalo bot built on top of the zca-js library. It transforms your personal Zalo account into a plugin-driven bot, featuring built-in support for commands, permissions, internationalization (i18n), and is incredibly easy to deploy.

> Alden Bot uses an unofficial Zalo API library and is not affiliated with Zalo. Running a personal account as a bot can violate platform rules or trigger account restrictions. Use a dedicated account and understand the risk before running it.

Vietnamese README: [README.vi.md](README.vi.md)

## Features

- 🔌 Highly extensible plugin architecture
- ⚡ Commands, permissions, cooldowns, and aliases
- 🧩 Stable plugin API through `@/api`
- 🌐 Core i18n and per-user language settings
- 📦 Runtime dependency install for plugins
- 🧰 PM2, Docker, tests, lint, and CI ready

## Requirements

- Node.js 22 or newer.
- npm (or pnpm, Yarn, or another compatible package manager).
- A Zalo account for the bot runtime.

## Quick Start

```bash
git clone https://github.com/finntrannn/alden-bot.git
cd alden-bot
npm install
cp .env.example .env
npm start
```

On first launch, follow the login or QR flow printed in the terminal. Runtime data is stored in `data/`, and plugins are loaded from `plugins/`.

## Environment

Copy `.env.example` to `.env` and edit only what you need.

`BotAdmin` means a Zalo user ID listed in `ADMIN_IDS`. BotAdmins own the bot runtime and can use privileged commands even if they are not group admins in a chat.

| Variable                | Default | Notes                                                            |
| ----------------------- | ------- | ---------------------------------------------------------------- |
| `ADMIN_IDS`             | empty   | Optional comma-separated Zalo user IDs with BotAdmin access.     |
| `BOT_PREFIX`            | `/`     | Command prefix. Empty values fall back to `/`.                   |
| `DEFAULT_LANGUAGE`      | `vi`    | Default language for new users.                                  |
| `LOG_LEVEL`             | `info`  | `debug`, `info`, `warn`, or `error`. Case-insensitive.           |
| `ENABLE_EVAL_COMMAND`   | `false` | Enables `/eval`. Keep off unless you fully trust every BotAdmin. |
| `ENABLE_RELOAD_COMMAND` | `false` | Enables `/reload`. Restarting is safer for long-running bots.    |
| `REPLY_UNKNOWN_COMMAND` | `false` | Reply when users send unknown commands.                          |
| `MESSAGE_QUEUE_DELAY`   | `500`   | Milliseconds between outgoing messages. `0` is allowed.          |

If `ADMIN_IDS` is empty, the bot can still run, but BotAdmin-only commands will not be usable until at least one operator ID is configured.

## Commands

| Command       | Purpose                                  | Required role |
| ------------- | ---------------------------------------- | ------------- |
| `/help`       | Show available commands.                 | Member        |
| `/ping`       | Check bot latency.                       | Member        |
| `/status`     | Show runtime and system status.          | Member        |
| `/cancel`     | Cancel a pending session.                | Member        |
| `/language`   | Change display language.                 | Member        |
| `/permission` | Manage virtual group permissions.        | Leader        |
| `/plugins`    | List loaded plugins.                     | BotAdmin      |
| `/restart`    | Restart the bot process.                 | BotAdmin      |
| `/reload`     | Reload plugins. Disabled by default.     | BotAdmin      |
| `/eval`       | Execute JavaScript. Disabled by default. | BotAdmin      |

`/eval` and `/reload` are not registered unless their `.env` flags are explicitly set to `true`.

## Plugins

Place each plugin in its own folder under `plugins/`:

```text
plugins/
  my-plugin/
    plugin.json
    index.ts
    package.json
```

Minimal `plugin.json`:

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

`plugin.json` is validated as a `PluginManifest`. Invalid plugins are skipped without crashing the bot.

Plugin authors should import from the stable public API:

```ts
import { CommandBase, I18nManager, PluginBase } from '@/api';
```

Deep imports from `src/...` are internal and may change between releases.

Plugin i18n is manual. The runtime only uses plugin translations when plugin code creates an `I18nManager`, loads it, and assigns it to `this.i18n` before registering translated commands.

Plugins are trusted full-power code. A plugin can access the same filesystem, network, environment variables, and process APIs as the bot. Install plugins only from sources you trust.

If a plugin includes `package.json`, Alden Bot can install its dependencies at runtime. Lockfiles are used when available; otherwise the runtime falls back to a production install.

Plugin examples and longer plugin docs live separately from this runtime repository.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f
```

Docker Compose mounts `./data` for runtime data and `./plugins` for plugin files.

## PM2

```bash
npm install
cp .env.example .env
pm2 start ecosystem.config.cjs
pm2 logs alden-bot
pm2 save
```

Use `/restart` only when the bot is managed by PM2 or Docker.

## Development

```bash
npm run dev
npm run test
npm run verify
npm run create-plugin -- <PluginName>
```

`npm run verify` is the main local gate: lint, format check, locale parity, tests, typecheck, and runtime smoke check. If you prefer pnpm or Yarn, use the equivalent `pnpm run ...` or `yarn ...` commands.

## Support

Use [GitHub Issues](https://github.com/finntrannn/alden-bot/issues) for bugs and questions. Pull requests are welcome when they keep the runtime stable, simple, and plugin-friendly.

## License

MIT. See [LICENSE](LICENSE).
