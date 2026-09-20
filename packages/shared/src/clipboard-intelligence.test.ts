import { describe, expect, it } from "vitest";
import { inspectClipboardText, typescriptInterfaceFromJson } from "./clipboard-intelligence";

describe("clipboard intelligence", () => {
  it("formats JSON and generates a local TypeScript interface", () => {
    expect(inspectClipboardText('{"user":{"name":"Ana"},"active":true}')).toEqual({
      kind: "json",
      formatted: '{\n  "user": {\n    "name": "Ana"\n  },\n  "active": true\n}',
    });
    expect(typescriptInterfaceFromJson('{"active":true}', "Clipboard data")).toBe(
      'interface Clipboarddata {\n  "active": boolean;\n}',
    );
  });

  it("recognizes common stack traces without sending clipboard content", () => {
    expect(inspectClipboardText("Error: boom\n    at run (index.ts:4:2)").kind).toBe("stack_trace");
  });
});
