// Handles the actual mint transaction against the badge NFT contract.
// The contract itself is deployed once, ahead of time, through Circle's
// Console (Templates tab, ERC-721 template). Circle explicitly
// recommends the Console path over the API path for a first deployment,
// it needs fewer prerequisites and is the faster route, so that's the
// one documented in the README rather than scripted here.
//
// Once deployed, drop the resulting contract address and your admin
// wallet ID into .env.local and this file handles every mint from then on.

const NFT_TEMPLATE_ID = "76b83278-50e2-4006-8b63-5b1a2a814533"; // Circle's audited ERC-721 template

function isConfigured() {
  return Boolean(
    process.env.CIRCLE_API_KEY &&
      process.env.CIRCLE_ENTITY_SECRET &&
      process.env.CIRCLE_BADGE_CONTRACT_ADDRESS &&
      process.env.CIRCLE_ADMIN_WALLET_ID
  );
}

/**
 * Mints the badge NFT to a recipient's wallet address. The admin wallet
 * (developer-controlled, funded with testnet gas) pays for and submits
 * the transaction, since Circle's model requires write calls to go
 * through the Developer-Controlled Wallets client, never the Smart
 * Contract Platform client directly.
 */
async function mintBadgeTo(recipientAddress, tokenId) {
  if (!isConfigured()) {
    throw new Error("Circle Contracts is not configured yet. See README for setup steps.");
  }

  const { initiateDeveloperControlledWalletsClient } = require("@circle-fin/developer-controlled-wallets");
  const { randomUUID } = require("crypto");

  const walletsClient = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET
  });

  const response = await walletsClient.createContractExecutionTransaction({
    idempotencyKey: randomUUID(),
    walletId: process.env.CIRCLE_ADMIN_WALLET_ID,
    contractAddress: process.env.CIRCLE_BADGE_CONTRACT_ADDRESS,
    abiFunctionSignature: "safeMint(address,uint256)",
    abiParameters: [recipientAddress, tokenId],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } }
  });

  return response.data; // { id: transactionId }, poll getTransaction() for status
}

module.exports = { isConfigured, mintBadgeTo, NFT_TEMPLATE_ID };
