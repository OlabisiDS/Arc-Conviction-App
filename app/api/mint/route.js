import { NextResponse } from "next/server";
import { isConfigured as isWalletConfigured, getOrCreateWalletForHandle } from "../../../lib/circleWallet";
import { isConfigured as isContractConfigured, mintBadgeTo } from "../../../lib/circleContract";

export async function POST(request) {
  if (!isWalletConfigured()) {
    return NextResponse.json(
      {
        error:
          "Minting isn't configured yet. Add CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, and CIRCLE_WALLET_SET_ID. See README."
      },
      { status: 501 }
    );
  }
  if (!isContractConfigured()) {
    return NextResponse.json(
      { error: "Badge contract isn't deployed yet. See README Circle Contracts section." },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const handle = (body.handle || "").trim().replace(/^@/, "");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle." }, { status: 400 });
  }

  try {
    const address = await getOrCreateWalletForHandle(handle);
    if (!address) {
      return NextResponse.json({ error: "Couldn't create a wallet for this handle." }, { status: 500 });
    }

    const transaction = await mintBadgeTo(address, Date.now());
    return NextResponse.json({ address, transaction });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Mint failed. Try again." }, { status: 500 });
  }
}
