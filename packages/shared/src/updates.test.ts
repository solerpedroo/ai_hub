import { describe, expect, it } from "vitest";
import { resolveUpdateCheckResult } from "./updates";

describe("resolveUpdateCheckResult", () => {
  it("skips unpackaged builds", () => {
    expect(
      resolveUpdateCheckResult({
        packaged: false,
        currentVersion: "0.1.0",
        failed: true,
        remoteVersion: "9.0.0",
      }),
    ).toEqual({ status: "skipped", version: null });
  });

  it("maps feed or network failure to unavailable without throwing", () => {
    expect(
      resolveUpdateCheckResult({
        packaged: true,
        currentVersion: "0.1.0",
        failed: true,
        remoteVersion: null,
      }),
    ).toEqual({ status: "unavailable", version: null });
  });

  it("reports an available remote version", () => {
    expect(
      resolveUpdateCheckResult({
        packaged: true,
        currentVersion: "0.1.0",
        failed: false,
        remoteVersion: "0.2.0",
      }),
    ).toEqual({ status: "available", version: "0.2.0" });
  });

  it("reports uptodate when versions match", () => {
    expect(
      resolveUpdateCheckResult({
        packaged: true,
        currentVersion: "0.1.0",
        failed: false,
        remoteVersion: "0.1.0",
      }),
    ).toEqual({ status: "uptodate", version: "0.1.0" });
  });
});
