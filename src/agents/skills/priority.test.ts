import { describe, it, expect } from "vitest";
import { resolveWildvineMetadata, parseFrontmatter } from "./frontmatter.js";

describe("skill priority", () => {
  it("parses P0 priority from wildvine frontmatter", () => {
    const content = `---
name: test-skill
description: A test skill
metadata: { "wildvine": { "priority": "P0" } }
---
# Test Skill`;
    const fm = parseFrontmatter(content);
    const meta = resolveWildvineMetadata(fm);
    expect(meta?.priority).toBe("P0");
    expect(meta?.always).toBe(true);
  });

  it("parses P1 priority", () => {
    const content = `---
name: test-skill
metadata: { "wildvine": { "priority": "P1" } }
---
# Test`;
    const fm = parseFrontmatter(content);
    const meta = resolveWildvineMetadata(fm);
    expect(meta?.priority).toBe("P1");
    expect(meta?.always).toBeUndefined();
  });

  it("parses P2 priority", () => {
    const content = `---
name: test-skill
metadata: { "wildvine": { "priority": "p2" } }
---
# Test`;
    const fm = parseFrontmatter(content);
    const meta = resolveWildvineMetadata(fm);
    expect(meta?.priority).toBe("P2");
  });

  it("ignores invalid priority values", () => {
    const content = `---
name: test-skill
metadata: { "wildvine": { "priority": "HIGH" } }
---
# Test`;
    const fm = parseFrontmatter(content);
    const meta = resolveWildvineMetadata(fm);
    expect(meta?.priority).toBeUndefined();
  });

  it("P0 sets always even when always is explicitly false", () => {
    const content = `---
name: test-skill
metadata: { "wildvine": { "always": false, "priority": "P0" } }
---
# Test`;
    const fm = parseFrontmatter(content);
    const meta = resolveWildvineMetadata(fm);
    expect(meta?.priority).toBe("P0");
    expect(meta?.always).toBe(true);
  });

  it("returns undefined metadata when no wildvine block exists", () => {
    const content = `---
name: test-skill
---
# Test`;
    const fm = parseFrontmatter(content);
    const meta = resolveWildvineMetadata(fm);
    expect(meta).toBeUndefined();
  });

  it("preserves always: true without priority", () => {
    const content = `---
name: test-skill
metadata: { "wildvine": { "always": true } }
---
# Test`;
    const fm = parseFrontmatter(content);
    const meta = resolveWildvineMetadata(fm);
    expect(meta?.always).toBe(true);
    expect(meta?.priority).toBeUndefined();
  });
});
