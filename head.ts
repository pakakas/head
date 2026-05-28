import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { encode as encodeMacro } from "../src/pap.ts" with { type: 'macro' };
import { mergeHelp } from "../src/help.ts" with { type: 'macro' };
import { encode } from "../src/pap.ts";

const papHelp = encodeMacro(mergeHelp({
  usage: "head [options] [file...]",
  command_desc: "Output the first part of files",
  flag: ["-n", "-L", "--ascii"],
  desc: [
    "Print the first N lines (default: 10)",
    "Include line numbers and upgrade to MarkZero",
    "Display formatted output"
  ]
}));

/**
 * Help function for head tool.
 */
export function help(decoder?: (pap: string) => void) {
  if (decoder) {
    decoder(papHelp);
  } else {
    process.stdout.write(papHelp + '\n');
  }
}

/**
 * Main tool logic.
 */
export async function run(args: string[], decoder?: (pap: string) => void) {
  const isHumanHelp = args.includes('--h') || args.includes('--ha') || args.includes('--ah') || args.includes('-hasci') || args.includes('-hascii') || args.includes('--hasci') || args.includes('--hascii');

  if (args.includes('--help') || args.includes('-h') || isHumanHelp) {
    if (isHumanHelp && !decoder) {
      const { mark0ToAscii } = await import('../.internal/pakakas-konsep/markzero-ascii.ts');
      help(mark0ToAscii);
    } else {
      help(decoder);
    }
    return;
  }

  const flags = {
    lineNumbers: args.includes("-L"),
    ascii: args.includes('--ascii') || args.includes('--a') || isHumanHelp,
  };

  let limit = 10;
  const nIndex = args.indexOf("-n");
  if (nIndex !== -1 && args[nIndex + 1]) {
    limit = parseInt(args[nIndex + 1]);
  }

  const files = args.filter((arg, i) => {
    if (arg === "-n" || arg === "-L" || arg === "--ascii" || arg === "--a") return false;
    if (i > 0 && args[i - 1] === "-n") return false;
    if (arg.startsWith("-") && arg !== "-") return false;
    return true;
  });

  const allResults: any[] = [];
  const needsStructure = flags.lineNumbers;
  let exitCode = 0;

  for (const path of (files.length > 0 ? files : ["-"])) {
    try {
      const input = (path === "-") ? Bun.stdin.stream() : createReadStream(path);
      const rl = createInterface({
        input: input as any,
        crlfDelay: Infinity
      });

      let count = 0;
      for await (const line of rl) {
        if (count >= limit) break;
        count++;

        if (needsStructure || flags.ascii || decoder) {
          allResults.push({
            ...(files.length > 1 ? { file: path } : {}),
            ...(flags.lineNumbers ? { line: count } : {}),
            text: line.trim()
          });
        } else {
          process.stdout.write(line + "\n");
        }
      }
    } catch (e) {
      console.error(`head: ${path}: ${(e as Error).message}`);
      exitCode = 1;
    }
  }

  if (allResults.length > 0) {
    const papData = encode([allResults]);
    if (flags.ascii && decoder) {
      decoder(papData);
    } else if (flags.ascii) {
      console.table(allResults);
    } else {
      process.stdout.write(papData + '\n');
    }
  }
}

if (import.meta.main) {
  run(process.argv.slice(2));
}
