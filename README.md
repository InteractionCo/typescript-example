# Poke + MCP Server Demo — TreeHacks 2026

Build a local MCP server with the TreeHacks schedule, tunnel it to your [Poke](https://poke.com) agent, and ask it questions like "What's happening at 3pm Saturday?" over text.

## What you're building

```
Your local MCP server (TreeHacks schedule)
        │
        │  npx poke tunnel
        ▼
   Poke Cloud ←── your agent
        │
        ▼
  You text your agent:
  "What events are at NVIDIA Auditorium tonight?"
```

Your Poke agent gets new **tools** it can call — powered by your local code. The agent decides when to use them based on your messages.

---

## Prerequisites

- **Node.js >= 18** (`node -v`)
- **A Poke account** — sign up at [poke.com](https://poke.com)

## 1. Set up the project

```bash
mkdir poke-treehacks-demo && cd poke-treehacks-demo
npm init -y
npm install poke @modelcontextprotocol/sdk zod
npm install -D typescript tsx @types/node
```

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "npx tsx server.ts"
  }
}
```

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "skipLibCheck": true
  },
  "include": ["*.ts"]
}
```

## 2. Create the MCP server

Create `server.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { z } from "zod";

// ── TreeHacks 2026 Schedule Data ────────────────────────────────

interface Event {
  time: string;
  name: string;
  location: string;
  day: "Friday" | "Saturday" | "Sunday";
  date: string;
}

const schedule: Event[] = [
  // Friday, Feb 13
  { day: "Friday", date: "Feb 13", time: "3:00 PM - 6:00 PM", name: "Hacker Check-In", location: "Huang Basement" },
  { day: "Friday", date: "Feb 13", time: "3:00 PM - 6:00 PM", name: "Hacker Team Formation Mixer", location: "Huang Basement" },
  { day: "Friday", date: "Feb 13", time: "5:00 PM - 6:00 PM", name: "Dinner", location: "Outside Huang" },
  { day: "Friday", date: "Feb 13", time: "6:45 PM", name: "Opening Ceremony Doors Open", location: "Memorial Auditorium" },
  { day: "Friday", date: "Feb 13", time: "7:15 PM - 9:15 PM", name: "Opening Ceremony", location: "Memorial Auditorium" },
  { day: "Friday", date: "Feb 13", time: "8:30 PM - 10:00 PM", name: "Dinner for late check-ins", location: "Huang: Forbes" },
  { day: "Friday", date: "Feb 13", time: "9:15 PM", name: "Return to Huang", location: "Huang" },
  { day: "Friday", date: "Feb 13", time: "9:30 PM", name: "HACKING BEGINS", location: "Huang" },
  { day: "Friday", date: "Feb 13", time: "9:30 PM - 12:00 AM", name: "PRL Open", location: "Hardware Lab" },
  { day: "Friday", date: "Feb 13", time: "9:30 PM - 10:00 PM", name: "We Have AI at Home: AI Infrastructure with Modal", location: "NVIDIA Auditorium" },
  { day: "Friday", date: "Feb 13", time: "9:30 PM - 10:30 PM", name: "Just Dance", location: "Huang Amphitheater" },
  { day: "Friday", date: "Feb 13", time: "9:30 PM - 12:00 AM", name: "Snacks Open", location: "Huang: Forbes" },
  { day: "Friday", date: "Feb 13", time: "9:30 PM - 12:00 AM", name: "Hardware Rental Open", location: "Hardware Lab" },
  { day: "Friday", date: "Feb 13", time: "9:30 PM - 10:00 PM", name: "Perplexity: Building the Future of Search", location: "Huang 18" },
  { day: "Friday", date: "Feb 13", time: "10:00 PM - 10:30 PM", name: "Anthropic: Introduction to Claude", location: "NVIDIA Auditorium" },
  { day: "Friday", date: "Feb 13", time: "10:00 PM - 12:00 AM", name: "On Call Cafe Pop-up", location: "Huang Basement" },
  { day: "Friday", date: "Feb 13", time: "10:30 PM - 10:45 PM", name: "Runpod: Agents, GPUs, and open-source models", location: "NVIDIA Auditorium" },
  { day: "Friday", date: "Feb 13", time: "10:30 PM - 11:00 PM", name: "Warp Typing Competition", location: "Huang 18" },
  { day: "Friday", date: "Feb 13", time: "10:45 PM - 11:00 PM", name: "Vercel: Just Ship it with Vercel", location: "NVIDIA Auditorium" },
  { day: "Friday", date: "Feb 13", time: "11:00 PM - 11:15 PM", name: "Elastic: Building end-to-end Agentic systems", location: "NVIDIA Auditorium" },
  { day: "Friday", date: "Feb 13", time: "11:00 PM - 12:00 AM", name: "Karaoke", location: "Huang 306" },
  { day: "Friday", date: "Feb 13", time: "11:15 PM - 11:30 PM", name: "Browserbase: Building with Stagehand", location: "NVIDIA Auditorium" },
  { day: "Friday", date: "Feb 13", time: "11:45 PM - 12:00 AM", name: "Cloudflare: Agents That Ship", location: "NVIDIA Auditorium" },

  // Saturday, Feb 14
  { day: "Saturday", date: "Feb 14", time: "12:00 AM - 3:00 AM", name: "Snacks Open", location: "Huang: Forbes" },
  { day: "Saturday", date: "Feb 14", time: "12:00 AM - 2:00 AM", name: "Hardware Rental Open", location: "Hardware Lab" },
  { day: "Saturday", date: "Feb 14", time: "12:00 AM - 12:45 AM", name: "Fireside Chat with Ali Partovi", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "6:30 AM - 8:00 AM", name: "Sunrise Dish Hike", location: "Huang Amphitheater" },
  { day: "Saturday", date: "Feb 14", time: "7:00 AM - 8:00 AM", name: "Snacks Open", location: "Huang: Forbes" },
  { day: "Saturday", date: "Feb 14", time: "8:00 AM - 9:00 AM", name: "Breakfast", location: "Outside Huang" },
  { day: "Saturday", date: "Feb 14", time: "8:00 AM - 11:30 PM", name: "Hardware Rental Open", location: "Hardware Lab" },
  { day: "Saturday", date: "Feb 14", time: "8:30 AM - 12:30 PM", name: "PRL Open", location: "Hardware Lab" },
  { day: "Saturday", date: "Feb 14", time: "9:00 AM - 12:00 PM", name: "Snacks Open", location: "Huang: Forbes" },
  { day: "Saturday", date: "Feb 14", time: "9:00 AM - 9:30 AM", name: "Stanford Ecopreneurship", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "9:45 AM - 10:00 AM", name: "BrightData", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "10:00 AM - 10:30 AM", name: "Fetch.ai: Build, Deploy & Monetise AI Agents", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "10:00 AM - 10:30 AM", name: "Human Capital Mixer", location: "Huang Foyer" },
  { day: "Saturday", date: "Feb 14", time: "10:00 AM - 11:30 AM", name: "Think Fast: Mind Controlled Car Racing", location: "Huang Amphitheater" },
  { day: "Saturday", date: "Feb 14", time: "10:30 AM - 11:00 AM", name: "Fireside Chat with Quincy Larson", location: "Huang 18" },
  { day: "Saturday", date: "Feb 14", time: "11:00 AM - 12:00 PM", name: "Midjourney: Fireside Chat with David Holz", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "11:00 AM - 11:30 AM", name: "Fetch-A-Donut - Fetch.ai", location: "Outside Huang" },
  { day: "Saturday", date: "Feb 14", time: "12:00 PM - 1:00 PM", name: "Lunch", location: "Outside Huang" },
  { day: "Saturday", date: "Feb 14", time: "1:00 PM - 6:00 PM", name: "Snacks Open", location: "Huang: Forbes" },
  { day: "Saturday", date: "Feb 14", time: "1:00 PM - 1:30 PM", name: "Google", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "1:00 PM - 2:00 PM", name: "Greylock Coffee Break", location: "Huang Foyer" },
  { day: "Saturday", date: "Feb 14", time: "1:00 PM - 4:00 PM", name: "Caricature Artist", location: "Huang Basement" },
  { day: "Saturday", date: "Feb 14", time: "1:00 PM - 3:00 PM", name: "Llamas", location: "Grass Outside Huang" },
  { day: "Saturday", date: "Feb 14", time: "1:30 PM - 2:00 PM", name: "NVIDIA: Open Models on the Edge", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "1:30 PM - 5:30 PM", name: "PRL Open", location: "Hardware Lab" },
  { day: "Saturday", date: "Feb 14", time: "2:00 PM - 4:30 PM", name: "Balloon Artist", location: "Huang Basement" },
  { day: "Saturday", date: "Feb 14", time: "2:00 PM - 3:00 PM", name: "Campus Tour", location: "Meet outside Huang Basement" },
  { day: "Saturday", date: "Feb 14", time: "2:00 PM - 2:30 PM", name: "Logitech: You've got Options with Logitech", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "2:00 PM - 3:00 PM", name: "Women/Non-Binary in Tech Mixer", location: "Huang Foyer" },
  { day: "Saturday", date: "Feb 14", time: "2:30 PM - 3:15 PM", name: "Fireside Chat with Chelsea Finn", location: "Huang 18" },
  { day: "Saturday", date: "Feb 14", time: "2:30 PM - 3:00 PM", name: "Fireside Chat with Rajat Teneja / VISA", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "3:00 PM - 3:30 PM", name: "OpenEvidence: Bottom-Up vs. Top-Down", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "3:30 PM - 4:00 PM", name: "Human Capital / xAI Tech Talk", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "3:30 PM - 3:45 PM", name: "Interaction Company: Building with Poke", location: "Huang 18" },
  { day: "Saturday", date: "Feb 14", time: "4:00 PM - 4:30 PM", name: "Greylock: Designing effective agent memory and tool use", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "4:30 PM - 5:00 PM", name: "OpenAI on OpenAI", location: "Huang 18" },
  { day: "Saturday", date: "Feb 14", time: "4:30 PM - 5:00 PM", name: "Human Capital Office Hours", location: "Huang 011" },
  { day: "Saturday", date: "Feb 14", time: "4:30 PM - 5:30 PM", name: "Mr. Sun Boba", location: "Outside Huang" },
  { day: "Saturday", date: "Feb 14", time: "5:00 PM - 5:15 PM", name: "Zingage: Longevity in AI", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "5:00 PM - 6:00 PM", name: "Greylock Bunnies and Gelato", location: "Grass Outside Huang" },
  { day: "Saturday", date: "Feb 14", time: "5:30 PM - 6:00 PM", name: "Zoom", location: "Huang 18" },
  { day: "Saturday", date: "Feb 14", time: "5:30 PM - 5:45 PM", name: "Graphite: Code Review with Graphite", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "6:00 PM - 7:00 PM", name: "Dinner", location: "Outside Huang" },
  { day: "Saturday", date: "Feb 14", time: "6:00 PM - 7:00 PM", name: "Tesla Coil Show", location: "Engineering Quad" },
  { day: "Saturday", date: "Feb 14", time: "7:00 PM - 11:30 PM", name: "Snacks Open", location: "Huang: Forbes" },
  { day: "Saturday", date: "Feb 14", time: "7:00 PM - 8:30 PM", name: "Lightsaber Battle", location: "Huang Amphitheater" },
  { day: "Saturday", date: "Feb 14", time: "7:00 PM - 11:00 PM", name: "PRL Open", location: "Hardware Lab" },
  { day: "Saturday", date: "Feb 14", time: "8:00 PM - 9:30 PM", name: "Robot Fighting", location: "Huang Amphitheater" },
  { day: "Saturday", date: "Feb 14", time: "8:30 PM - 11:30 PM", name: "Poker Night", location: "Huang 1st Floor Atrium" },
  { day: "Saturday", date: "Feb 14", time: "9:15 PM - 9:30 PM", name: "Bubbles and Bonding", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "9:30 PM - 10:30 PM", name: "V-Day Event / Live Game Show", location: "NVIDIA Auditorium" },
  { day: "Saturday", date: "Feb 14", time: "11:00 PM - 12:00 AM", name: "OpenEvidence Super Smash Bros Tournament", location: "Huang 18" },

  // Sunday, Feb 15
  { day: "Sunday", date: "Feb 15", time: "12:30 AM - 9:00 AM", name: "Hardware Rental Open", location: "Hardware Lab" },
  { day: "Sunday", date: "Feb 15", time: "12:30 AM - 8:30 AM", name: "Snacks Open", location: "Huang: Forbes" },
  { day: "Sunday", date: "Feb 15", time: "5:30 AM - 9:30 AM", name: "PRL Open", location: "Hardware Lab" },
  { day: "Sunday", date: "Feb 15", time: "8:30 AM - 9:30 AM", name: "Breakfast", location: "Outside Huang" },
  { day: "Sunday", date: "Feb 15", time: "9:00 AM - 9:30 AM", name: "Judge Check-In", location: "Huang Basement" },
  { day: "Sunday", date: "Feb 15", time: "9:30 AM", name: "HACKING ENDS / DEVPOST DUE", location: "Huang" },
  { day: "Sunday", date: "Feb 15", time: "10:30 AM - 1:00 PM", name: "PROJECT EXPO / JUDGING", location: "Huang" },
  { day: "Sunday", date: "Feb 15", time: "12:30 PM - 2:30 PM", name: "Hardware Return", location: "Hardware Lab" },
  { day: "Sunday", date: "Feb 15", time: "1:00 PM - 1:30 PM", name: "Project Clean Up / Hardware Return", location: "Huang Basement" },
  { day: "Sunday", date: "Feb 15", time: "1:00 PM - 2:00 PM", name: "Lunch", location: "Outside Huang" },
  { day: "Sunday", date: "Feb 15", time: "2:30 PM", name: "Closing Ceremony Doors Open", location: "Memorial Auditorium" },
  { day: "Sunday", date: "Feb 15", time: "3:00 PM - 4:30 PM", name: "Closing Ceremony", location: "Memorial Auditorium" },
  { day: "Sunday", date: "Feb 15", time: "4:30 PM", name: "Return to Huang/Packard", location: "Huang" },
  { day: "Sunday", date: "Feb 15", time: "5:00 PM", name: "Hackers Depart", location: "Huang" },
];

// ── MCP Server ──────────────────────────────────────────────────

const server = new McpServer(
  { name: "treehacks-schedule", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tool 1: Search events by keyword
server.tool(
  "search_events",
  "Search TreeHacks 2026 events by keyword (name, location, or day)",
  {
    query: z.string().describe("Search keyword (e.g. 'Anthropic', 'NVIDIA Auditorium', 'Saturday')"),
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const results = schedule.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.day.toLowerCase().includes(q)
    );
    if (results.length === 0) {
      return { content: [{ type: "text", text: `No events found matching "${query}".` }] };
    }
    const text = results
      .map((e) => `${e.day} ${e.date} | ${e.time} | ${e.name} | ${e.location}`)
      .join("\n");
    return { content: [{ type: "text", text }] };
  }
);

// Tool 2: Get full schedule for a day
server.tool(
  "get_day_schedule",
  "Get the full TreeHacks schedule for a specific day",
  {
    day: z.enum(["Friday", "Saturday", "Sunday"]).describe("Day of the hackathon"),
  },
  async ({ day }) => {
    const events = schedule.filter((e) => e.day === day);
    const text = events
      .map((e) => `${e.time} — ${e.name} (${e.location})`)
      .join("\n");
    return {
      content: [{ type: "text", text: `TreeHacks ${day}, ${events[0]?.date}:\n\n${text}` }],
    };
  }
);

// Tool 3: What's happening now / at a specific time
server.tool(
  "whats_happening",
  "Find events happening at a specific time on a given day",
  {
    day: z.enum(["Friday", "Saturday", "Sunday"]).describe("Day"),
    hour: z.number().min(0).max(23).describe("Hour in 24h format (e.g. 14 for 2 PM)"),
  },
  async ({ day, hour }) => {
    const results = schedule.filter((e) => {
      if (e.day !== day) return false;
      const match = e.time.match(/(\d+):(\d+)\s*(AM|PM)/);
      if (!match) return false;
      let startHour = parseInt(match[1]!);
      const ampm = match[3]!;
      if (ampm === "PM" && startHour !== 12) startHour += 12;
      if (ampm === "AM" && startHour === 12) startHour = 0;
      const endMatch = e.time.match(/-\s*(\d+):(\d+)\s*(AM|PM)/);
      if (endMatch) {
        let endHour = parseInt(endMatch[1]!);
        const endAmpm = endMatch[3]!;
        if (endAmpm === "PM" && endHour !== 12) endHour += 12;
        if (endAmpm === "AM" && endHour === 12) endHour = 0;
        if (endHour < startHour) endHour += 24;
        const checkHour = hour < startHour ? hour + 24 : hour;
        return checkHour >= startHour && checkHour < endHour;
      }
      return startHour === hour;
    });

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: `Nothing scheduled for ${day} at ${hour}:00.` }],
      };
    }
    const text = results
      .map((e) => `${e.time} — ${e.name} (${e.location})`)
      .join("\n");
    return { content: [{ type: "text", text }] };
  }
);

// Tool 4: Find events at a location
server.tool(
  "events_at_location",
  "Find all events at a specific location",
  {
    location: z.string().describe("Location name (e.g. 'NVIDIA Auditorium', 'Huang 18')"),
  },
  async ({ location }) => {
    const loc = location.toLowerCase();
    const results = schedule.filter((e) => e.location.toLowerCase().includes(loc));
    if (results.length === 0) {
      return { content: [{ type: "text", text: `No events found at "${location}".` }] };
    }
    const text = results
      .map((e) => `${e.day} ${e.date} | ${e.time} | ${e.name}`)
      .join("\n");
    return { content: [{ type: "text", text }] };
  }
);

// Tool 5: Get food/snack schedule
server.tool(
  "food_schedule",
  "Get all food and snack times at TreeHacks",
  {},
  async () => {
    const foodKeywords = ["breakfast", "lunch", "dinner", "snack", "boba", "donut", "gelato", "cafe", "coffee"];
    const results = schedule.filter((e) =>
      foodKeywords.some((k) => e.name.toLowerCase().includes(k))
    );
    const text = results
      .map((e) => `${e.day} ${e.date} | ${e.time} | ${e.name} (${e.location})`)
      .join("\n");
    return { content: [{ type: "text", text }] };
  }
);

// ── Start the server ────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "8787");

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

await server.connect(transport);

const httpServer = createServer(async (req, res) => {
  if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
    await transport.handleRequest(req, res);
  } else {
    res.writeHead(404);
    res.end("Not found — MCP endpoint is at /mcp");
  }
});

httpServer.listen(PORT, () => {
  console.log(`TreeHacks MCP server running at http://localhost:${PORT}/mcp`);
  console.log(`\nTools available:`);
  console.log(`  - search_events       Search by keyword`);
  console.log(`  - get_day_schedule    Full day schedule`);
  console.log(`  - whats_happening     Events at a specific time`);
  console.log(`  - events_at_location  Events at a venue`);
  console.log(`  - food_schedule       All food/snack times`);
  console.log(`\nNext step: run "npx poke tunnel http://localhost:${PORT}/mcp --name treehacks" in another terminal`);
});
```

## 3. Log in to Poke

```bash
npx poke login
```

This opens your browser. Sign in with your Poke account.

## 4. Start the MCP server

```bash
npm run dev
```

You should see:

```
TreeHacks MCP server running at http://localhost:8787/mcp

Tools available:
  - search_events       Search by keyword
  - get_day_schedule    Full day schedule
  - whats_happening     Events at a specific time
  - events_at_location  Events at a venue
  - food_schedule       All food/snack times
```

## 5. Tunnel it to Poke

In a **second terminal**:

```bash
npx poke tunnel http://localhost:8787/mcp --name "TreeHacks Schedule"
```

You'll see:

```
Tunnel is active!

  Tunnel URL: https://...
  Local:      http://localhost:8787/mcp
  Name:       TreeHacks Schedule

Tools synced.
Press Ctrl+C to stop the tunnel.
```

That's it. Your agent now has access to the TreeHacks schedule tools.

## 6. Try it out

Once you see **"Tools synced."** — that's it. Your agent is live. Any code you write locally is now callable by your AI agent over text.

Pull out your phone and text your Poke agent:

> **"What talks are at NVIDIA Auditorium on Saturday?"**

> **"When's lunch?"**

> **"What's happening at 10pm Friday?"**

> **"Find me something fun to do Saturday night"**

> **"When does hacking end?"**

Your agent calls your local MCP tools through the tunnel, gets the results, and texts you back conversationally. No API keys to manage, no deployment, no infra — just your code running locally, accessible to your AI agent from anywhere.

**This is the whole point:** you write tools in TypeScript, tunnel them to Poke, and now your agent can do new things. Swap the TreeHacks schedule for anything — a database, an API, your smart home, a game engine — and your agent can interact with it over text.

---

## Alternative: Let AI build your MCP server (`poke wrap`)

Don't want to write the MCP server yourself? `poke wrap` uses AI to analyze any project and auto-generate an MCP server for it.

### Try it on this project

```bash
cd poke-treehacks-demo
npx poke wrap --name "TreeHacks"
```

This will:

1. Analyze your project files with Claude
2. Generate a Python MCP server with tools based on what it finds
3. Start the server locally
4. Tunnel it to Poke automatically

You need [uv](https://docs.astral.sh/uv/) installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`).

### Try it on any project

`poke wrap` works on any codebase. Point it at a repo and it figures out what tools to expose:

```bash
cd ~/my-cool-project
npx poke wrap --name "My Project"
```

It'll generate tools for things like running tests, building, calling APIs — whatever makes sense for the project.

### Share it

Add `--share` to generate a QR code that others can scan to connect your tools to their Poke agent:

```bash
npx poke wrap --name "TreeHacks" --share
```

---

## Bonus: Webhooks with the SDK

You can also use the Poke SDK programmatically. Create `webhook-example.ts`:

```typescript
import { Poke } from "poke";

const poke = new Poke(); // uses POKE_API_KEY env var or poke login credentials

// Send a direct message to your agent
await poke.sendMessage("Remind me when the Closing Ceremony starts on Sunday");

// Create a webhook — your agent will act on incoming data
const webhook = await poke.createWebhook({
  condition: "When a teammate pushes code",
  action: "Send me a summary of what changed",
});

console.log("Webhook URL:", webhook.webhookUrl);
console.log("Webhook Token:", webhook.webhookToken);

// Fire the webhook (e.g. from a CI/CD pipeline, GitHub Action, etc.)
await poke.sendWebhook({
  webhookUrl: webhook.webhookUrl,
  webhookToken: webhook.webhookToken,
  data: {
    event: "push",
    repo: "treehacks-project",
    author: "alice",
    message: "Add real-time collaboration feature",
    files_changed: 12,
  },
});
```

Run it:

```bash
npx tsx webhook-example.ts
```

---

## How it works

### MCP (Model Context Protocol)

MCP is an open protocol that lets AI agents call tools on external servers. Your MCP server defines **tools** with names, descriptions, and typed parameters. When you tunnel it to Poke, your agent discovers those tools and can call them autonomously when relevant.

```
You: "What's at NVIDIA Auditorium tonight?"
         │
         ▼
   Poke Agent thinks:
   "I should use the events_at_location tool"
         │
         ▼
   Agent calls: events_at_location({ location: "NVIDIA Auditorium" })
         │
         ▼  (through tunnel)
   Your local server returns matching events
         │
         ▼
   Agent: "Tonight at NVIDIA Auditorium you've got the V-Day Live Game Show
           at 9:30 PM! Before that there's Bubbles and Bonding at 9:15."
```

### `npx poke tunnel`

Creates a secure reverse tunnel from your local machine to Poke's infrastructure. No port forwarding, no ngrok, no public IP needed. The tunnel stays active as long as the CLI is running. Tools are synced every 5 minutes.

### `npx poke wrap`

Uses Claude to analyze your project and auto-generate an MCP server that exposes 5-10 useful tools. Then tunnels it automatically. Zero config.

### The Poke SDK (`npm install poke`)

Three methods:

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
poke-treehacks-demo/
├── server.ts              # MCP server with TreeHacks schedule + tools
├── webhook-example.ts     # SDK webhook example (optional)
├── package.json
├── tsconfig.json
└── README.md
```

## Useful links

- [poke.com](https://poke.com) — sign up / manage your agent
- [poke on npm](https://www.npmjs.com/package/poke)
- [MCP spec](https://modelcontextprotocol.io)
- [Poke API keys](https://poke.com/kitchen/api-keys)

---

Built for [TreeHacks 2026](https://www.treehacks.com/) by [Interaction Company](https://poke.com).
