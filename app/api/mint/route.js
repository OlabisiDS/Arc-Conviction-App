import { NextResponse } from "next/server";
import { isConfigured, createWalletChallenge } from "../../../lib/circleWallet";

// Step 1 of the mint flow. Returns everything the client-side Circle Web
// SDK needs to show the actual wallet setup / PIN popup. The mint itself
// happens in /api/mint/confirm, after that popup succeeds.
export async function POST(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Minting isn't configured yet. Add CIRCLE_API_KEY and CIRCLE_APP_ID to .env.local, see README."
      },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const handle = (body.handle || "").trim().replace(/^@/, "");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle." }, { status: 400 });
  }

  try {
    const challenge = await createWalletChallenge(handle);
    return NextResponse.json(challenge);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Couldn't start the wallet setup. Try again." },
      { status: 500 }
    );
  }
}
