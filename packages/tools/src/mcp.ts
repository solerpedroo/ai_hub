import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readScopedFile } from "./filesystem";

export interface McpRequest { method: string; params?: Record<string, unknown>; }
export interface McpResponse { id: number; result?: unknown; error?: { code: number; message: string }; }
export interface McpClient { request(request: McpRequest, signal?: AbortSignal): Promise<unknown>; close(): Promise<void>; }
export const MCP_REQUEST_TIMEOUT_MS = 15_000;
const MAX_MCP_RESPONSE_BYTES = 256 * 1024;

/** Main-only reference MCP connector for a project's scoped filesystem. */
export class ProjectFilesystemMcpClient implements McpClient {
  constructor(private readonly rootPath: string) {}
  async request(request: McpRequest, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw new Error("tools:aborted");
    if (request.method !== "tools/call" || request.params?.name !== "read_file") throw new Error("tools:mcp_method_not_found");
    const args = request.params.arguments;
    if (!args || typeof args !== "object" || typeof (args as { path?: unknown }).path !== "string") throw new Error("tools:mcp_invalid_params");
    const file = await readScopedFile(this.rootPath, (args as { path: string }).path);
    return { content: file.content, fileName: file.fileName, truncated: file.truncated };
  }
  async close(): Promise<void> {}
}

function parseJsonRpc(value: string): McpResponse | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || !("id" in parsed) || typeof (parsed as { id?: unknown }).id !== "number") return null;
    return parsed as McpResponse;
  } catch { return null; }
}

export class StdioMcpClient implements McpClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private buffer = "";
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor(command: string, args: readonly string[]) {
    this.child = spawn(command, [...args], { shell: false, windowsHide: true, env: { PATH: process.env.PATH ?? "" } });
    this.child.stdout.on("data", (chunk: Buffer) => this.receive(chunk.toString("utf8")));
    this.child.stderr.resume();
    this.child.once("error", () => this.rejectAll(new Error("tools:mcp_unavailable")));
    this.child.once("exit", () => this.rejectAll(new Error("tools:mcp_disconnected")));
  }

  async request(request: McpRequest, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw new Error("tools:aborted");
    const id = this.nextId++;
    const payload = `${JSON.stringify({ jsonrpc: "2.0", id, ...request })}\n`;
    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error("tools:mcp_timeout")); }, MCP_REQUEST_TIMEOUT_MS);
      const abort = (): void => { clearTimeout(timeout); this.pending.delete(id); reject(new Error("tools:aborted")); };
      signal?.addEventListener("abort", abort, { once: true });
      this.pending.set(id, { resolve: (value) => { clearTimeout(timeout); signal?.removeEventListener("abort", abort); resolve(value); }, reject: (error) => { clearTimeout(timeout); signal?.removeEventListener("abort", abort); reject(error); } });
      this.child.stdin.write(payload, (error) => { if (error) { clearTimeout(timeout); this.pending.delete(id); reject(new Error("tools:mcp_unavailable")); } });
    });
  }

  async close(): Promise<void> { this.rejectAll(new Error("tools:mcp_closed")); this.child.kill(); }

  private receive(text: string): void {
    this.buffer += text;
    if (Buffer.byteLength(this.buffer, "utf8") > MAX_MCP_RESPONSE_BYTES) { this.rejectAll(new Error("tools:mcp_response_too_large")); this.child.kill(); return; }
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      const response = parseJsonRpc(line);
      if (!response) continue;
      const pending = this.pending.get(response.id);
      if (!pending) continue;
      this.pending.delete(response.id);
      if (response.error) pending.reject(new Error(`tools:mcp:${response.error.code}`)); else pending.resolve(response.result);
    }
  }

  private rejectAll(error: Error): void { for (const pending of this.pending.values()) pending.reject(error); this.pending.clear(); }
}

export class SseMcpClient implements McpClient {
  constructor(private readonly endpoint: URL, private readonly allowInsecureLocalhost = false) {
    const local = endpoint.hostname === "127.0.0.1" || endpoint.hostname === "localhost" || endpoint.hostname === "::1";
    if (endpoint.username || endpoint.password || endpoint.search || (endpoint.protocol !== "https:" && !(this.allowInsecureLocalhost && local && endpoint.protocol === "http:"))) throw new Error("tools:unsafe_mcp_url");
  }
  async request(request: McpRequest, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MCP_REQUEST_TIMEOUT_MS);
    const abort = (): void => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(this.endpoint, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...request }), signal: controller.signal });
      if (!response.ok) throw new Error(`tools:mcp_http_${response.status}`);
      const body = await readBodyLimited(response);
      const json = response.headers.get("content-type")?.includes("text/event-stream") ? body.split(/\r?\n/).find((line) => line.startsWith("data:"))?.slice(5).trim() : body;
      const parsed = json ? parseJsonRpc(json) : null;
      if (!parsed) throw new Error("tools:mcp_invalid_response");
      if (parsed.error) throw new Error(`tools:mcp:${parsed.error.code}`);
      return parsed.result;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("tools:")) throw error;
      throw new Error(signal?.aborted ? "tools:aborted" : "tools:mcp_unavailable");
    } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
  }
  async close(): Promise<void> {}
}

async function readBodyLimited(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_MCP_RESPONSE_BYTES) throw new Error("tools:mcp_response_too_large");
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}
