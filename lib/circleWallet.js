// Developer-controlled wallets: your backend creates and owns the wallet
// directly, silently, the moment someone mints. No email, no OTP, no PIN
// popup, nothing external. The tradeoff, spelled out plainly: your app
// custodies these wallets, not each individual person. For a free
// conviction badge people mint to share on Twitter, that's the right
// tradeoff, nobody needs to manage a crypto wallet just to get a badge.

function isConfigured() {
  return Boolean(
    process.env.CIRCLE_API_KEY &&
      process.env.CIRCLE_ENTITY_SECRET &&
      process.env.CIRCLE_WALLET_SET_ID
  );
}

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const fs = require("fs");
const path = require("path");
const WALLETS_FILE = path.join(process.cwd(), "data", "circleWallets.json");

function readWalletsFromFile() {
  if (!fs.existsSync(WALLETS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(WALLETS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeWalletsToFile(wallets) {
  const dir = path.dirname(WALLETS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
}

/**
 * Every handle gets exactly one wallet, created the first time they mint,
 * reused every time after. Run this once in Supabase before using it in
 * production:
 *
 * create table circle_wallets (
 *   handle text primary key,
 *   address text not null
 * );
 */
async function getOrCreateWalletForHandle(handle) {
  const key = handle.toLowerCase();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("circle_wallets")
      .select("address")
      .eq("handle", key)
      .maybeSingle();

    if (data?.address) return data.address;

    const address = await createWallet(handle);
    await supabase.from("circle_wallets").upsert({ handle: key, address });
    return address;
  }

  const wallets = readWalletsFromFile();
  if (wallets[key]) return wallets[key];

  const address = await createWallet(handle);
  wallets[key] = address;
  writeWalletsToFile(wallets);
  return address;
}

async function createWallet(handle) {
  const { initiateDeveloperControlledWalletsClient } = require("@circle-fin/developer-controlled-wallets");
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET
  });

  const response = await client.createWallets({
    walletSetId: process.env.CIRCLE_WALLET_SET_ID,
    accountType: "SCA",
    blockchains: ["ARC-TESTNET"],
    count: 1,
    metadata: [{ name: handle, refId: handle }]
  });

  return response.data?.wallets?.[0]?.address;
}

module.exports = { isConfigured, getOrCreateWalletForHandle };
