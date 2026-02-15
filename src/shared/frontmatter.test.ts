import { describe, expect, test } from "vitest";
import {
  getFrontmatterString,
  normalizeStringList,
  parseFrontmatterBool,
  resolveWildvineManifestBlock,
} from "./frontmatter.js";

describe("shared/frontmatter", () => {
  test("normalizeStringList handles strings and arrays", () => {
    expect(normalizeStringList("a, b,,c")).toEqual(["a", "b", "c"]);
    expect(normalizeStringList([" a ", "", "b"])).toEqual(["a", "b"]);
    expect(normalizeStringList(null)).toEqual([]);
  });

  test("getFrontmatterString extracts strings only", () => {
    expect(getFrontmatterString({ a: "b" }, "a")).toBe("b");
    expect(getFrontmatterString({ a: 1 }, "a")).toBeUndefined();
  });

  test("parseFrontmatterBool respects fallback", () => {
    expect(parseFrontmatterBool("true", false)).toBe(true);
    expect(parseFrontmatterBool("false", true)).toBe(false);
    expect(parseFrontmatterBool(undefined, true)).toBe(true);
  });

  test("resolveWildvineManifestBlock parses JSON5 metadata and picks wildvine block", () => {
    const frontmatter = {
      metadata: "{ wildvine: { foo: 1, bar: 'baz' } }",
    };
    expect(resolveWildvineManifestBlock({ frontmatter })).toEqual({ foo: 1, bar: "baz" });
  });

  test("resolveWildvineManifestBlock returns undefined for invalid input", () => {
    expect(resolveWildvineManifestBlock({ frontmatter: {} })).toBeUndefined();
    expect(
      resolveWildvineManifestBlock({ frontmatter: { metadata: "not-json5" } }),
    ).toBeUndefined();
    expect(
      resolveWildvineManifestBlock({ frontmatter: { metadata: "{ nope: { a: 1 } }" } }),
    ).toBeUndefined();
  });
});
