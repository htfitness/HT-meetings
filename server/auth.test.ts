import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

describe("password authentication primitives", () => {
  it("hashes and verifies passwords with bcrypt", async () => {
    const hash = await bcrypt.hash("correct horse battery staple", 10);
    expect(hash).not.toContain("correct horse");
    await expect(
      bcrypt.compare("correct horse battery staple", hash),
    ).resolves.toBe(true);
    await expect(bcrypt.compare("wrong password", hash)).resolves.toBe(false);
  });
});
