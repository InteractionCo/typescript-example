# Poke + MCP Server Example

Build a local MCP server, tunnel it to your [Poke](https://poke.com) agent, and give your agent new capabilities — callable over text from anywhere.

This example exposes device info tools, but you can swap in anything: a database, an API, your smart home, a game engine.

## What you're building

```
Your local MCP server (device info tools)
        |
        |  npx poke tunnel
        v
   Poke Cloud <-- your agent
        |
        v
  You text your agent:
  "What device are you connected to?"
```

Your Poke agent gets new **tools** it can call — powered by your local code. The agent decides when to use them based on your messages.

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

In a **second terminal**:

```bash
npx poke tunnel http://localhost:8787/mcp --name "Device Info"
```

Once you see **"Tools synced."** — your agent is live.

### 4. Try it

Text your Poke agent:

> **"What device are you connected to?"**

> **"How much memory does my computer have?"**

> **"What's my CPU load right now?"**

> **"What OS am I running?"**

Your agent calls your local MCP tools through the tunnel and texts you back with real data from your machine.

---

## Tools included

| Tool | What it returns |
|------|----------------|
| `get_device_info` | OS, CPU, memory, hostname, architecture, uptime |
| `get_network_info` | Network interfaces, IPs, MACs |
| `get_system_usage` | CPU load averages, memory usage percentage |
| `get_shell_info` | Shell, terminal, environment details, OS version |

---

## Make it your own

The server is just `server.ts`. Replace the device info tools with whatever you want:

```typescript
server.tool(
  "my_tool_name",
  "Description of what this tool does",
  { param: z.string().describe("A parameter") },
  async ({ param }) => {
    // your code here
    return { content: [{ type: "text", text: "result" }] };
  }
);
```

Restart the server, and the tunnel syncs the new tools to your agent automatically.

---

## Alternative: Let AI build your MCP server (`poke wrap`)

Don't want to write the MCP server yourself? `poke wrap` uses AI to analyze any project and auto-generate an MCP server for it.

```bash
cd ~/my-cool-project
npx poke wrap --name "My Project"
```

This will:

1. Analyze your project files
2. Generate a Python MCP server with tools based on what it finds
3. Start the server and tunnel it to Poke automatically

You need [uv](https://docs.astral.sh/uv/) installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`).

Add `--share` to generate a QR code that others can scan to connect your tools to their agent:

```bash
npx poke wrap --name "My Project" --share
```

---

## Webhooks with the SDK

You can also use the Poke SDK programmatically. See `webhook-example.ts`:

```typescript
import { Poke } from "poke";

const poke = new Poke();

// Send a message to your agent
await poke.sendMessage("Remind me to check the deploy at 5pm");

// Create a webhook trigger
const webhook = await poke.createWebhook({
  condition: "When a teammate pushes code",
  action: "Send me a summary of what changed",
});

// Fire the webhook with data
await poke.sendWebhook({
  webhookUrl: webhook.webhookUrl,
  webhookToken: webhook.webhookToken,
  data: { event: "push", repo: "my-project", author: "alice" },
});
```

Run it:

```bash
npx tsx webhook-example.ts
```

---

## How it works

### MCP (Model Context Protocol)

MCP is an open protocol that lets AI agents call tools on external servers. Your MCP server defines **tools** with names, descriptions, and typed parameters. When you tunnel it to Poke, your agent discovers those tools and can call them autonomously.

```
You: "How much RAM do I have free?"
         |
         v
   Poke Agent thinks:
   "I should use the get_device_info tool"
         |
         v
   Agent calls: get_device_info()
         |
         v  (through tunnel)
   Your local server returns device info
         |
         v
   Agent: "You have 10.3 GB free out of 48 GB total."
```

### `npx poke tunnel`

Creates a secure reverse tunnel from your local machine to Poke's infrastructure. No port forwarding, no ngrok, no public IP needed. The tunnel stays active as long as the CLI is running.

### The Poke SDK (`npm install poke`)

| Method | What it does |
|--------|-------------|
| `poke.sendMessage(text)` | Send a message to your agent (like texting it) |
| `poke.createWebhook({ condition, action })` | Create a trigger that fires when you send webhook data |
| `poke.sendWebhook({ webhookUrl, webhookToken, data })` | Fire a webhook with arbitrary JSON data |

---

## CLI Reference

```bash
npx poke login                    # Authenticate with your Poke account
npx poke logout                   # Clear stored credentials
npx poke whoami                   # Show current user

npx poke tunnel <url> -n <name>   # Expose local MCP server to your agent
npx poke tunnel <url> -n <name> --share   # ...and generate a shareable QR code

npx poke mcp add <url> -n <name>  # Add a remote MCP server
npx poke mcp add <url> -n <name> --api-key <key>  # ...with auth

npx poke wrap                     # AI-generate an MCP server from your project
npx poke wrap -n <name> --share   # ...and share it
```

## Project structure

```
typescript-example/
  server.ts              # MCP server with device info tools
  webhook-example.ts     # SDK webhook example
  package.json
  tsconfig.json
  README.md
```

## Links

- [poke.com](https://poke.com) — sign up / manage your agent
- [poke on npm](https://www.npmjs.com/package/poke)
- [MCP spec](https://modelcontextprotocol.io)
- [Poke API keys](https://poke.com/kitchen/api-keys)
