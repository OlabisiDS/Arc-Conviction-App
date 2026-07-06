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
 * the transaction. The contract auto-assigns the token ID internally
 * (see nextTokenIdToMint on the contract), so tokenId is accepted here
 * for backward compatibility but not actually sent to the contract.
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
    abiFunctionSignature: "mintTo(address)",
    abiParameters: [recipientAddress],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } }
  });

  const transactionId = response.data?.id;
  if (!transactionId) {
    throw new Error("Circle did not return a transaction id.");
  }

  // Submission succeeding doesn't mean the mint succeeded, Circle
  // processes it asynchronously. Poll until it actually confirms or
  // fails, so we never tell the person "minted" when it silently didn't.
  const maxAttempts = 10;
  const delayMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const statusRes = await walletsClient.getTransaction({ id: transactionId });
    const tx = statusRes.data?.transaction;
    const state = tx?.state;

    if (state === "COMPLETE" || state === "CONFIRMED") {
      return { id: transactionId, state, txHash: tx.txHash };
    }
    if (state === "FAILED" || state === "CANCELLED" || state === "DENIED") {
      throw new Error(
        `Mint failed on-chain (${state}). Check the admin wallet's gas balance and the contract's mint permissions.`
      );
    }
    // otherwise still PENDING/QUEUED/INITIATED, keep polling
  }

  throw new Error(
    "Mint is taking longer than expected. Check Circle Console > Dev Controlled > Transactions for the real status."
  );
}

module.exports = { isConfigured, mintBadgeTo, NFT_TEMPLATE_ID };
