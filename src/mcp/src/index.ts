import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { VNStockMCPServer } from "./server/vn-stock-mcp-server.js";
import { ConfigManager } from "./server/config-manager.js";

async function start() {
  const configManager = new ConfigManager();
  const config = configManager.getServerConfig();
  const server = new VNStockMCPServer(config);

  if (config.transportType === "http") {
    const app = express();
    app.use(express.json());

    const transport = new StreamableHTTPServerTransport();
    await server.connect(transport);

    app.post("/mcp", async (req, res) => {
      await transport.handleRequest(req, res, req.body);
    });

    app.listen(config.port, () => {
      console.log(`MCP server listening on http://${config.host}:${config.port}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

start().catch((err) => {
  console.error("Failed to start MCP server", err);
  process.exit(1);
});
