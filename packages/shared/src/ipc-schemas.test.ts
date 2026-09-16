import { describe, expect, it } from "vitest";
import {
  emptyIpcPayloadSchema,
  ipcAckResultSchema,
  windowIsMaximizedResultSchema,
} from "./ipc-schemas";

describe("emptyIpcPayloadSchema", () => {
  it("accepts an empty object", () => {
    expect(emptyIpcPayloadSchema.parse({})).toEqual({});
  });

  it("rejects extra keys", () => {
    expect(() => emptyIpcPayloadSchema.parse({ extra: true })).toThrow();
  });
});

describe("windowIsMaximizedResultSchema", () => {
  it("accepts booleans only", () => {
    expect(windowIsMaximizedResultSchema.parse(true)).toBe(true);
    expect(windowIsMaximizedResultSchema.parse(false)).toBe(false);
    expect(() => windowIsMaximizedResultSchema.parse("true")).toThrow();
  });
});

describe("ipcAckResultSchema", () => {
  it("accepts undefined or null ack", () => {
    expect(ipcAckResultSchema.parse(undefined)).toBeUndefined();
    expect(ipcAckResultSchema.parse(null)).toBeNull();
  });
});
