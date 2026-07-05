import { NextResponse } from "next/server";
import { mintBadgeTo, isConfigured as isContractConfigured } from "../../../lib/circleContract";

const CIRCLE_BASE_URL = "https://api.circle.com";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const BLOCKCHAIN = "ARC-TESTNET";

function isConfigured() {
  return Boolean(process.env.CIRCLE_API_KEY && process.env.CIRCLE_APP_ID);
}

export async function POST(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Minting isn't configured yet. Add CIRCLE_API_KEY and CIRCLE_APP_ID. See README." },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { action, ...params } = body || {};

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  try {
    switch (action) {
      case "requestEmailOtp": {
        const { deviceId, email } = params;
        if (!deviceId || !email) {
          return NextResponse.json({ error: "Missing deviceId or email" }, { status: 400 });
        }

        const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/users/email/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`
          },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            deviceId,
            email
          })
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json(data, { status: res.status });

        // { deviceToken, deviceEncryptionKey, otpToken }
        return NextResponse.json(data.data);
      }

      case "initializeUser": {
        const { userToken } = params;
        if (!userToken) {
          return NextResponse.json({ error: "Missing userToken" }, { status: 400 });
        }

        const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/user/initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken
          },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            accountType: "SCA",
            blockchains: [BLOCKCHAIN]
          })
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json(data, { status: res.status }); // 155106 = already initialized, handled client-side

        // { challengeId }
        return NextResponse.json(data.data);
      }

      case "listWallets": {
        const { userToken } = params;
        if (!userToken) {
          return NextResponse.json({ error: "Missing userToken" }, { status: 400 });
        }

        const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken
          }
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json(data, { status: res.status });

        // { wallets: [...] }
        return NextResponse.json(data.data);
      }

      case "mintBadge": {
        const { userToken } = params;
        if (!userToken) {
          return NextResponse.json({ error: "Missing userToken" }, { status: 400 });
        }
        if (!isContractConfigured()) {
          return NextResponse.json(
            { error: "Badge contract isn't deployed yet. See README Circle Contracts section." },
            { status: 501 }
          );
        }

        const walletsRes = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken
          }
        });
        const walletsData = await walletsRes.json();
        if (!walletsRes.ok) return NextResponse.json(walletsData, { status: walletsRes.status });

        const address = walletsData.data?.wallets?.[0]?.address;
        if (!address) {
          return NextResponse.json({ error: "No wallet found for this user yet." }, { status: 400 });
        }

        const transaction = await mintBadgeTo(address, Date.now());
        return NextResponse.json({ address, transaction });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message || "Request failed." }, { status: 500 });
  }
}
