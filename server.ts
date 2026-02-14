import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import os from "os";
import { z } from "zod";

// ── Tool definitions (registered once per server instance) ──────

function registerTools(server: McpServer) {
  server.tool(
    "get_device_info",
    "Get basic info about the device running this server (OS, architecture, hostname, etc.)",
    {},
    async () => {
      const info = [
        `Hostname: ${os.hostname()}`,
        `Platform: ${os.platform()}`,
        `OS: ${os.type()} ${os.release()}`,
        `Architecture: ${os.arch()}`,
        `CPUs: ${os.cpus().length}x ${os.cpus()[0]?.model ?? "unknown"}`,
        `Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
        `Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
        `Uptime: ${formatUptime(os.uptime())}`,
        `Node.js: ${process.version}`,
        `User: ${os.userInfo().username}`,
        `Home Dir: ${os.homedir()}`,
        `Temp Dir: ${os.tmpdir()}`,
      ];
      return { content: [{ type: "text", text: info.join("\n") }] };
    }
  );

  server.tool(
    "get_network_info",
    "Get network interface info (names, IPs, MACs)",
    {},
    async () => {
      const interfaces = os.networkInterfaces();
      const lines: string[] = [];
      for (const [name, addrs] of Object.entries(interfaces)) {
        if (!addrs) continue;
        for (const addr of addrs) {
          if (addr.internal) continue;
          lines.push(`${name}: ${addr.address} (${addr.family}, MAC: ${addr.mac})`);
        }
      }
      if (lines.length === 0) lines.push("No external network interfaces found.");
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "get_system_usage",
    "Get current CPU load averages and memory usage",
    {},
    async () => {
      const loadAvg = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
      const lines = [
        `Load Average (1m / 5m / 15m): ${loadAvg.map((l) => l.toFixed(2)).join(" / ")}`,
        `Memory: ${(usedMem / 1024 / 1024 / 1024).toFixed(1)} GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(1)} GB (${memPercent}% used)`,
        `Free Memory: ${(freeMem / 1024 / 1024 / 1024).toFixed(1)} GB`,
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "get_shell_info",
    "Get shell environment info (shell, terminal, PATH summary, env vars count)",
    {},
    async () => {
      const lines = [
        `Shell: ${process.env.SHELL ?? "unknown"}`,
        `Terminal: ${process.env.TERM_PROGRAM ?? process.env.TERM ?? "unknown"}`,
        `PATH entries: ${(process.env.PATH ?? "").split(":").length}`,
        `Environment variables: ${Object.keys(process.env).length}`,
        `Current directory: ${process.cwd()}`,
        `PID: ${process.pid}`,
      ];
      try {
        if (os.platform() === "darwin") {
          const swVers = execSync("sw_vers", { encoding: "utf-8", timeout: 3000 }).trim();
          lines.push("", "macOS Info:", swVers);
        } else if (os.platform() === "win32") {
          const ver = execSync("ver", { encoding: "utf-8", timeout: 3000 }).trim();
          lines.push("", "Windows Info:", ver);
        } else {
          try {
            const release = execSync("cat /etc/os-release 2>/dev/null | head -5", {
              encoding: "utf-8",
              timeout: 3000,
            }).trim();
            if (release) lines.push("", "Linux Info:", release);
          } catch {}
        }
      } catch {}
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(" ");
}

// ── Start the server ────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "8787");

const httpServer = createServer(async (req, res) => {
  if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
    const server = new McpServer(
      { name: "device-info", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    registerTools(server);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } else {
    res.writeHead(404);
    res.end("Not found — MCP endpoint is at /mcp");
  }
});

httpServer.listen(PORT, () => {
  console.log(`Device Info MCP server running at http://localhost:${PORT}/mcp`);
  console.log(`\nTools available:`);
  console.log(`  - get_device_info    OS, CPU, memory, hostname`);
  console.log(`  - get_network_info   Network interfaces and IPs`);
  console.log(`  - get_system_usage   CPU load and memory usage`);
  console.log(`  - get_shell_info     Shell and environment details`);
  console.log(`\nNext step — in another terminal, run:\n`);
  console.log(`  npx poke tunnel http://localhost:${PORT}/mcp --name "Device Info"\n`);
});
