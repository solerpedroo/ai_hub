import { createServer } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { SseMcpClient, StdioMcpClient } from "./mcp";

describe("MCP transports", () => {
  it("uses JSON-RPC over stdio without a shell", async () => {
    const program = "process.stdin.on('data', b => { for (const line of b.toString().trim().split('\\n')) { const x = JSON.parse(line); process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:x.id,result:{ok:x.method}})+'\\n'); } });";
    const client = new StdioMcpClient(process.execPath, ["-e", program]);
    try {
      await expect(client.request({ method: "tools/list" })).resolves.toEqual({ ok: "tools/list" });
    } finally { await client.close(); }
  });

  it("parses a one-shot SSE JSON-RPC response and rejects credential URLs", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end('data: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n\n');
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const client = new SseMcpClient(new URL(`http://127.0.0.1:${address.port}/mcp`), true);
    try {
      await expect(client.request({ method: "tools/list" })).resolves.toEqual({ ok: true });
      expect(() => new SseMcpClient(new URL(`http://user:secret@127.0.0.1:${address.port}/mcp`))).toThrow("tools:unsafe_mcp_url");
    } finally { await client.close(); server.close(); }
  });
});
