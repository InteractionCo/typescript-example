# Poke + MCP Server Example

Build a local MCP server, tunnel it to your [Poke](https://poke.com) agent, and give your agent new capabilities it can use over text.

This repo is a working example you can clone and run. It includes a sample server with device info tools, but the pattern works with anything: a database, an API, your smart home, a game engine. Write tools in TypeScript, tunnel them to Poke, and your agent can call them from anywhere.

## How it works

```
Your local MCP server
        |
        |  npx poke tunnel
        v
   Poke Cloud <-- your agent
        |
        v
  You text your agent
```

You define **tools** on your MCP server. When you tunnel it to Poke, your agent discovers those tools and calls them when relevant. You text your agent a question, it calls your tools through the tunnel, and texts you back with the result.

---

## Quick start

```bash
git clone https://github.com/InteractionCo/typescript-example.git
cd typescript-example
npm install
```

### 1. Log in to Poke

```bash
npx poke login
```

### 2. Start the MCP server

```bash
npm run dev
```

### 3. Tunnel it to Poke

In a second terminal:

```bash
npx poke tunnel http://localhost:8787/mcp --name "Device Info"
```

Once you see **"Tools synced."**, the tunnel is running.

### 4. Connect it to your agent

Go to [poke.com/integrations/new](https://poke.com/integrations/new) to connect the tunneled server to your Poke agent, or add it to a recipe in the [Poke Kitchen](https://poke.com/kitchen).

### 5. Try it

Text your Poke agent:

> "What device are you connected to?"

> "How much memory does my computer have?"

> "What's my CPU load right now?"

Your agent calls your local tools through the tunnel and texts you back with real data from your machine.

---

## What's in this example

The sample server in `server.ts` exposes four device info tools:

| Tool | Returns |
|------|---------|
| `get_device_info` | OS, CPU, memory, hostname, architecture, uptime |
| `get_network_info` | Network interfaces, IPs, MACs |
| `get_system_usage` | CPU load averages, memory usage |
| `get_shell_info` | Shell, terminal, environment details |

These are just examples. Replace them with your own tools.

---

## Writing your own tools

The server is a single file: `server.ts`. Add a tool like this:

```typescript
server.tool(
  "my_tool",
  "Description of what this tool does",
  { query: z.string().describe("A search query") },
  async ({ query }) => {
    // your code here
    return { content: [{ type: "text", text: "result" }] };
  }
);
```

Restart the server and the tunnel picks up the new tools automatically.

---

## Using `poke wrap` instead

Don't want to write the MCP server yourself? `poke wrap` uses AI to analyze any project and auto-generate an MCP server for it.

```bash
cd ~/my-project
npx poke wrap --name "My Project"
```

This will:

1. Analyze your project files
2. Generate a Python MCP server with tools based on what it finds
3. Start the server and tunnel it to Poke automatically

Requires [uv](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`).

Add `--share` to generate a QR code others can scan to connect your tools to their agent:

```bash
npx poke wrap --name "My Project" --share
```

---

## Webhooks

You can also use the Poke SDK to send messages and create webhook triggers programmatically. See `webhook-example.ts` for a working example.

```typescript
import { Poke } from "poke";

const poke = new Poke();

await poke.sendMessage("Remind me to check the deploy at 5pm");

const webhook = await poke.createWebhook({
  condition: "When a deploy fails",
  action: "Send me a summary of the error",
});

await poke.sendWebhook({
  webhookUrl: webhook.webhookUrl,
  webhookToken: webhook.webhookToken,
  data: { event: "deploy_failed", service: "api", error: "timeout" },
});
```

```bash
npx tsx webhook-example.ts
```

---

## SDK reference

| Method | What it does |
|--------|-------------|
| `poke.sendMessage(text)` | Send a message to your agent |
| `poke.createWebhook({ condition, action })` | Create a webhook trigger |
| `poke.sendWebhook({ webhookUrl, webhookToken, data })` | Fire a webhook with JSON data |

## CLI reference

```bash
npx poke login                              # Log in
npx poke logout                             # Log out
npx poke whoami                             # Show current user

npx poke tunnel <url> -n <name>             # Tunnel a local MCP server
npx poke tunnel <url> -n <name> --share     # Tunnel and generate a share QR code

npx poke mcp add <url> -n <name>            # Add a remote MCP server
npx poke mcp add <url> -n <name> --api-key <key>

npx poke wrap                               # Auto-generate MCP server from your project
npx poke wrap -n <name> --share
```

## Project structure

```
typescript-example/
  server.ts              # MCP server (device info example)
  webhook-example.ts     # SDK webhook example
  package.json
  tsconfig.json
```

## Links

- [poke.com](https://poke.com)
- [poke on npm](https://www.npmjs.com/package/poke)
- [MCP spec](https://modelcontextprotocol.io)
- [Poke API keys](https://poke.com/kitchen/api-keys)
