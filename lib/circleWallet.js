const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(process.cwd(), "data", "circleUsers.json");
const BLOCKCHAIN = "ARC-TESTNET"; // confirm exact enum string in the Circle console once your project is set up

function isConfigured() {
  return Boolean(process.env.CIRCLE_API_KEY && process.env.CIRCLE_APP_ID);
}

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeUsers(users) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Every Twitter handle maps to exactly one Circle user, created the first
 * time that handle tries to mint. Circle's own userId must be a UUID, so
 * we generate one and remember the mapping locally (same JSON-file
 * pattern as the scan cache; swap for Supabase alongside it later).
 */
function getOrCreateCircleUserId(handle) {
  const users = readUsers();
  const key = handle.toLowerCase();
  if (users[key]) return users[key];

  const { randomUUID } = require("crypto");
  const userId = randomUUID();
  users[key] = userId;
  writeUsers(users);
  return userId;
}

/**
 * Kicks off the wallet creation + PIN setup flow for a handle. Returns
 * everything the client-side Circle Web SDK needs to show the actual
 * "set up your wallet" popup. If Circle isn't configured yet, returns
 * null so the caller can fall back to the placeholder response.
 */
async function createWalletChallenge(handle) {
  if (!isConfigured()) return null;

  const { initiateUserControlledWalletsClient } = require("@circle-fin/user-controlled-wallets");
  const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY });

  const userId = getOrCreateCircleUserId(handle);

  // Creating a user that already exists is safe. Circle returns an error
  // we can ignore if this handle has minted before.
  try {
    await client.createUser({ userId });
  } catch (err) {
    // Already exists, continue.
  }

  const tokenResponse = await client.createUserToken({ userId });
  const userToken = tokenResponse.data?.userToken;
  const encryptionKey = tokenResponse.data?.encryptionKey;

  const walletResponse = await client.createUserPinWithWallets({
    userToken,
    accountType: "SCA",
    blockchains: [BLOCKCHAIN]
  });

  return {
    appId: process.env.CIRCLE_APP_ID,
    userToken,
    encryptionKey,
    challengeId: walletResponse.data?.challengeId
  };
}

/**
 * Called after the client-side Web SDK challenge succeeds. Looks up the
 * wallet address Circle just created for this user, so the admin wallet
 * can mint the badge NFT to it.
 */
async function getWalletAddress(userToken) {
  const { initiateUserControlledWalletsClient } = require("@circle-fin/user-controlled-wallets");
  const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY });

  // Verify the exact method name against Circle's docs if this errors,
  // it mirrors the GET /wallets REST endpoint filtered by this user's token.
  const response = await client.listWallets({ userToken });
  const wallet = response.data?.wallets?.[0];
  return wallet?.address || null;
}

module.exports = {
  isConfigured,
  getOrCreateCircleUserId,
  createWalletChallenge,
  getWalletAddress
};
