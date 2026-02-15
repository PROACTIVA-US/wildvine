import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { POSIX_WILDVINE_TMP_DIR, resolvePreferredWildvineTmpDir } from "./tmp-wildvine-dir.js";

describe("resolvePreferredWildvineTmpDir", () => {
  it("prefers /tmp/wildvine when it already exists and is writable", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o40700,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredWildvineTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(lstatSync).toHaveBeenCalledTimes(1);
    expect(accessSync).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(POSIX_WILDVINE_TMP_DIR);
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("prefers /tmp/wildvine when it does not exist but /tmp is writable", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    // second lstat call (after mkdir) should succeed
    lstatSync.mockImplementationOnce(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    lstatSync.mockImplementationOnce(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o40700,
    }));

    const resolved = resolvePreferredWildvineTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(POSIX_WILDVINE_TMP_DIR);
    expect(accessSync).toHaveBeenCalledWith("/tmp", expect.any(Number));
    expect(mkdirSync).toHaveBeenCalledWith(POSIX_WILDVINE_TMP_DIR, expect.any(Object));
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("falls back to os.tmpdir()/wildvine when /tmp/wildvine is not a directory", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => false,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o100644,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredWildvineTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "wildvine-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back to os.tmpdir()/wildvine when /tmp is not writable", () => {
    const accessSync = vi.fn((target: string) => {
      if (target === "/tmp") {
        throw new Error("read-only");
      }
    });
    const lstatSync = vi.fn(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredWildvineTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "wildvine-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back when /tmp/wildvine is a symlink", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => true,
      uid: 501,
      mode: 0o120777,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredWildvineTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "wildvine-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back when /tmp/wildvine is not owned by the current user", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 0,
      mode: 0o40700,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredWildvineTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "wildvine-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back when /tmp/wildvine is group/other writable", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o40777,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredWildvineTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "wildvine-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });
});
