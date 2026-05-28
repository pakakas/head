import { $ } from "bun";
import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { writeFileSync, unlinkSync } from "node:fs";
import { decode } from "../src/pap";

const TEST_FILE = "head/test_head_file.txt";
const TEST_CONTENT = Array.from({ length: 25 }, (_, i) => `line ${i + 1}`).join("\n");

describe("head tool", () => {
  beforeAll(() => {
    writeFileSync(TEST_FILE, TEST_CONTENT + "\n");
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_FILE);
    } catch (e) {}
  });

  test("should print first 10 lines by default", async () => {
    const { stdout } = await $`bun head/head.ts ${TEST_FILE}`.quiet();
    const lines = stdout.toString().trim().split("\n");
    expect(lines.length).toBe(10);
    expect(lines[0]).toBe("line 1");
    expect(lines[9]).toBe("line 10");
  });

  test("should handle -n flag", async () => {
    const { stdout } = await $`bun head/head.ts -n 5 ${TEST_FILE}`.quiet();
    const lines = stdout.toString().trim().split("\n");
    expect(lines.length).toBe(5);
    expect(lines[4]).toBe("line 5");
  });

  test("should upgrade to MarkZero with -L flag", async () => {
    const { stdout } = await $`bun head/head.ts -L -n 3 ${TEST_FILE}`.quiet();
    const results = decode(stdout.toString().trim())[0];
    expect(results.length).toBe(3);
    expect(results[0].line).toBe("1");
    expect(results[0].text).toBe("line 1");
  });

  test("should support --ascii table format", async () => {
    const { stdout } = await $`bun head/head.ts -n 3 --ascii ${TEST_FILE}`.quiet();
    const output = stdout.toString();
    expect(output).toContain("┌───");
    expect(output).toContain("text");
    expect(output).toContain("line 1");
  });

  test("should produce 4 grids and 1 map for help payload", async () => {
    const { stdout } = await $`bun head/head.ts -h`.quiet();
    const raw = stdout.toString();
    const blocks = decode(raw.trim());
    expect(blocks.length).toBe(5);
    
    const helpMap = blocks[4];
    expect(helpMap.command_desc).toEqual(blocks[2]);
    expect(helpMap.usage).toEqual(blocks[3]);
  });
});

// Refined help test
test("head tool > help payload structure", async () => {
    const { stdout } = await $`bun head/head.ts -h`.quiet();
    const blocks = decode(stdout.toString().trim());
    expect(blocks.length).toBe(5);
    const helpMap = blocks[4];
    expect(helpMap.usage).toEqual(blocks[3]);
});
