// Writes the Solidity standard JSON input for each template to contracts/verify/<Name>.json.
// BOTScan verification of user instances submits these files, so the server never needs a
// compiler and never accepts source code from a client.
// Usage: node script/standard-json.mjs           write the files
//        node script/standard-json.mjs --check   fail if a file differs from a fresh build (CI)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

export const TEMPLATES = {
  "uzo.token": { name: "UzoToken", path: "src/templates/UzoToken.sol" },
  "uzo.nft": { name: "UzoNFT", path: "src/templates/UzoNFT.sol" },
  "uzo.tipjar": { name: "UzoTipJar", path: "src/templates/UzoTipJar.sol" },
};

const check = process.argv.includes("--check");
const dir = new URL("../verify/", import.meta.url);
mkdirSync(dir, { recursive: true });

let stale = 0;
for (const { name, path } of Object.values(TEMPLATES)) {
  // The address is a placeholder: --show-standard-json-input only prints, it does not submit.
  const out = execFileSync(
    "forge",
    [
      "verify-contract",
      "0x000000000000000000000000000000000000dEaD",
      `${path}:${name}`,
      "--show-standard-json-input",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const json = JSON.stringify(JSON.parse(out)) + "\n";
  const file = new URL(`${name}.json`, dir);

  if (check) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (current !== json) {
      console.error(`verify/${name}.json is out of date. Run: node script/standard-json.mjs`);
      stale++;
    } else {
      console.log(`verify/${name}.json is up to date`);
    }
  } else {
    writeFileSync(file, json);
    console.log(`Wrote verify/${name}.json`);
  }
}
if (stale) process.exit(1);
