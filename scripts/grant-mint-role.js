// Run once: node scripts/grant-mint-role.js
// Uses your existing CIRCLE_ADMIN_WALLET_ID (confirmed to already hold
// DEFAULT_ADMIN_ROLE) to grant itself the missing mint role, the same
// action the Circle Console tried to do, just not limited to Console's
// own wallet list.

const fs = require("fs");
const path = require("path");

// Minimal .env.local loader, no extra dependency needed
const envPath = path.join(process.cwd(), ".env.local");
console.log("Looking for .env.local at:", envPath);
console.log("File exists:", fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  let raw = fs.readFileSync(envPath, "utf8");
  // Strip BOM if present, common with files saved via Windows tools
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const lines = raw.split(/\r?\n/);
  console.log("Lines read from file:", lines.length);

  const foundKeys = [];
  for (const line of lines) {
    const match = line.match(/^([^#=\s][^=]*?)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
      foundKeys.push(key);
    }
  }
  console.log("Keys found in .env.local:", foundKeys.join(", "));
}

const { initiateDeveloperControlledWalletsClient } = require("@circle-fin/developer-controlled-wallets");
const { randomUUID } = require("crypto");

const apiKey = process.env.CIRCLE_API_KEY || "";
const colonCount = (apiKey.match(/:/g) || []).length;
console.log(`CIRCLE_API_KEY format check: ${colonCount === 2 ? "looks OK (2 colons)" : `WRONG, found ${colonCount} colons, expected 2`}`);
console.log(`CIRCLE_API_KEY starts with: ${apiKey.slice(0, 15)}...`);

const MINT_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
const TARGET_ACCOUNT = "0x7d2678d8128df629bc59bda29e26198234f9d757";

async function main() {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET
  });

  console.log("Submitting grantRole transaction...");

  const response = await client.createContractExecutionTransaction({
    idempotencyKey: randomUUID(),
    walletId: process.env.CIRCLE_ADMIN_WALLET_ID,
    contractAddress: process.env.CIRCLE_BADGE_CONTRACT_ADDRESS,
    abiFunctionSignature: "grantRole(bytes32,address)",
    abiParameters: [MINT_ROLE, TARGET_ACCOUNT],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } }
  });

  const transactionId = response.data?.id;
  console.log("Submitted. Transaction ID:", transactionId);
  console.log("Polling for confirmation...");

  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await client.getTransaction({ id: transactionId });
    const state = statusRes.data?.transaction?.state;
    console.log(`  attempt ${attempt + 1}: state = ${state}`);

    if (state === "COMPLETE" || state === "CONFIRMED") {
      console.log("SUCCESS. Role granted. TX hash:", statusRes.data.transaction.txHash);
      return;
    }
    if (state === "FAILED" || state === "CANCELLED" || state === "DENIED") {
      console.error("FAILED. Full response:", JSON.stringify(statusRes.data, null, 2));
      return;
    }
  }

  console.log("Still pending after 20s, check Circle Console > Transactions manually.");
}

main().catch((err) => console.error("Error:", err.message));
