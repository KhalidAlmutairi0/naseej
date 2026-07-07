import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "./auth-db.server";

describe("CranL auth primitives", () => {
  it("hashes staff passwords and rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).toMatch(/^scrypt\$/);
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("signs session tokens and rejects tampered payloads", () => {
    const token = createSessionToken(
      {
        userId: "00000000-0000-0000-0000-000000000001",
        role: "staff",
        shopId: "00000000-0000-0000-0000-000000000002",
        staffRole: "owner",
      },
      "test-secret",
    );

    expect(verifySessionToken(token, "test-secret")).toMatchObject({
      userId: "00000000-0000-0000-0000-000000000001",
      role: "staff",
      shopId: "00000000-0000-0000-0000-000000000002",
      staffRole: "owner",
    });

    const [payload, signature] = token.split(".");
    const tampered = `${payload.replace(/.$/, payload.endsWith("A") ? "B" : "A")}.${signature}`;

    expect(verifySessionToken(tampered, "test-secret")).toBeNull();
  });

  it("does not require a session secret when no cookie token exists", () => {
    expect(verifySessionToken(undefined)).toBeNull();
  });
});
