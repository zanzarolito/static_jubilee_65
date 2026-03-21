# mcp-todo-server

A hands-on tutorial repository for learning how to build an **MCP (Model Context Protocol) server** in TypeScript.

> **Target audience**: Developers who have read the MCP docs but have never built an MCP server in practice.

---

## What's in this repo?

```
mcp-todo-server/
├── todo-app/          # Fully functional Todo web app (Express + SQLite)
├── mcp-server/        # MCP server exposing the Todo app as LLM tools
├── TP.md              # 📖 The full tutorial (in French)
└── mcp.json           # Client configuration examples
```

### The Todo App (`todo-app/`)

A complete, locally-deployed Todo application with:
- **REST API**: `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`
- **SQLite persistence** via `better-sqlite3`
- **Vanilla JS frontend** — no framework, clean UI

### The MCP Server (`mcp-server/`)

An MCP server (stdio transport) that exposes 4 tools:

| Tool | Description |
|------|-------------|
| `list_tasks` | Returns all tasks (optional status filter) |
| `add_task` | Creates a new task |
| `complete_task` | Marks a task as done |
| `delete_task` | Permanently deletes a task |

The server calls the Todo app's REST API (no direct DB access) — demonstrating proper separation of concerns.

---

## Quick Start

### 1. Start the Todo app

```bash
cd todo-app
npm install
npm run dev
# ✅ Running at http://localhost:3000
```

### 2. Test the MCP server

```bash
cd mcp-server
npm install

# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts

# Add a task via MCP
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"add_task","arguments":{"title":"Learn MCP"}}}' | npx tsx src/index.ts
```

### 3. Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "todo": {
      "command": "npx",
      "args": ["tsx", "/ABSOLUTE/PATH/TO/mcp-todo-server/mcp-server/src/index.ts"],
      "env": { "TODO_API_URL": "http://localhost:3000" }
    }
  }
}
```

### 4. Connect to Claude Code CLI

```bash
claude mcp add todo -- npx tsx $(pwd)/mcp-server/src/index.ts
```

---

## Tutorial

**Read the full tutorial: [TP.md](./TP.md)** *(in French)*

The tutorial covers:
1. MCP concepts in 5 minutes (diagram, primitives, transports)
2. Running and testing the Todo app
3. Guided code walkthrough of the MCP server
4. 4 progressive exercises (read → guided → semi-autonomous → free)
5. Connecting to Claude Desktop, Claude Code, Cursor, Zed
6. Going further: Resources, Prompts, HTTP transport

---

## Tech Stack

- **TypeScript** with strict mode
- **Express.js** + **better-sqlite3** (Todo app)
- **@modelcontextprotocol/sdk** + **Zod** (MCP server)
- **tsx** for running TypeScript directly (no build step)

---

## License

MIT
