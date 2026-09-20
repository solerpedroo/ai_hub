import { describe, expect, it } from "vitest";
import { divergenceTerms, recommendModelRoute } from "./council";

describe("Council and Router helpers", () => {
  it("keeps routing deterministic and explainable", () => {
    expect(recommendModelRoute("say hello")).toMatchObject({ tier: "fast", reason: "simple" });
    expect(recommendModelRoute("review this TypeScript code")).toMatchObject({ tier: "balanced", reason: "code" });
    expect(recommendModelRoute("perform a security threat analysis")).toMatchObject({ tier: "frontier", reason: "complex" });
  });

  it("surfaces terms that differ between visible answers", () => {
    expect(divergenceTerms(["Use Postgres with replicas", "Use SQLite for local-first"])).toEqual(expect.arrayContaining(["postgres", "sqlite"]));
  });
});
