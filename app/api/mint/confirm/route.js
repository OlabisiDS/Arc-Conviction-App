import { NextResponse } from "next/server";
import { getWalletAddress } from "../../../../lib/circleWallet";
import { isConfigured, mintBadgeTo } from "../../../../lib/circleContract";

// Step 2 of the mint flow. Called after the client-side Web SDK
// challenge (PIN popup) succeeds, so a wallet now exists for this user.
export async function POST(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "The badge contract isn't deployed yet. Deploy it via Circle's Console Templates tab, then add CIRCLE_BADGE_CONTRACT_ADDRESS and CIRCLE_ADMIN_WALLET_ID to .env.local. See README."
      },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { userToken, tokenId } = body;

  if (!userToken) {
    return NextResponse.json({ error: "Missing userToken." }, { status: 400 });
  }

  try {
    const address = await getWalletAddress(userToken);
    if (!address) {
      return NextResponse.json({ error: "No wallet found for this user yet." }, { status: 400 });
    }

    const transaction = await mintBadgeTo(address, tokenId || Date.now());
    return NextResponse.json({ address, transaction });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Mint failed. Try again." },
      { status: 500 }
    );
  }
}
