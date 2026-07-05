"use client";

import { useRef, useState } from "react";
import HeroArch from "../components/HeroArch";
import ConvictionCard from "../components/ConvictionCard";
import AnalysisReport from "../components/AnalysisReport";
import TierLadder from "../components/TierLadder";

export default function Home() {
  const [handle, setHandle] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mintStatus, setMintStatus] = useState("");
  const cardRef = useRef(null);

  async function handleScan(e) {
    e.preventDefault();
    if (!handle.trim()) return;

    setLoading(true);
    setError("");
    setMintStatus("");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Couldn't reach the scan service. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!cardRef.current) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `arc-conviction-${result.profile.handle}.png`;
    link.href = dataUrl;
    link.click();
  }

  async function handleMint() {
    setMintStatus("Setting up your wallet...");

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: result.profile.handle })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMintStatus(data.error || "Couldn't start minting.");
        return;
      }

      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
      const sdk = new W3SSdk({ appSettings: { appId: data.appId } });
      sdk.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });

      // Required before execute() will work, establishes a session via
      // Circle's hosted iframe. Silently breaks execute() if skipped.
      if (typeof sdk.getDeviceId === "function") {
        await sdk.getDeviceId();
      }

      setMintStatus("Confirm the popup to set up your wallet...");

      sdk.execute(data.challengeId, async (error, challengeResult) => {
        if (error) {
          setMintStatus(error.message || "Wallet setup was cancelled or failed.");
          return;
        }

        setMintStatus("Wallet ready. Minting your badge...");

        const confirmRes = await fetch("/api/mint/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userToken: data.userToken })
        });
        const confirmData = await confirmRes.json();

        if (!confirmRes.ok || confirmData.error) {
          setMintStatus(confirmData.error || "Mint failed.");
          return;
        }

        setMintStatus(`Minted to ${confirmData.address.slice(0, 6)}...${confirmData.address.slice(-4)}`);
      });
    } catch (err) {
      setMintStatus("Something went wrong setting up the wallet.");
    }
  }

  return (
    <main className="shell">
      <div className="hero-arch-wrap">
        <HeroArch />
      </div>

      <p className="eyebrow">arc network</p>
      <h1 className="title">
        What&apos;s your <em>arc conviction</em>?
      </h1>
      <p className="subtitle">
        Drop any handle. We&apos;ll read their last 30 days, score how consistent
        their Arc presence really is, and turn it into a card worth sharing.
      </p>

      <form className="scan-panel" onSubmit={handleScan}>
        <input
          className="scan-input"
          placeholder="@handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
        <button className="scan-button" type="submit" disabled={loading}>
          {loading ? "scanning..." : "scan"}
        </button>
      </form>
      <p className="hint">Running on mock data until a real API key is configured. See README.</p>

      <TierLadder activeTier={result?.conviction?.tier} />

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="results-enter" style={{ marginTop: 40 }}>
          {result.cached && (
            <p className="cooldown-note">
              Showing a saved result. Handles can only be rescanned every 3 days.
            </p>
          )}

          <ConvictionCard
            ref={cardRef}
            profile={result.profile}
            conviction={result.conviction}
            postCount={result.postCount}
          />

          {result.reaction && (
            <p
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: 17,
                color: "#f6cf9a",
                margin: "16px 0 0",
                maxWidth: 360
              }}
            >
              {result.reaction}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14, width: 360 }}>
            <button className="ghost-button" onClick={handleSave}>
              save card
            </button>
            <button className="ghost-button" onClick={handleMint}>
              mint on testnet
            </button>
          </div>
          {mintStatus && <p className="cooldown-note" style={{ margin: "10px 0 0" }}>{mintStatus}</p>}

          <AnalysisReport analysis={result.analysis} />
        </div>
      )}
    </main>
  );
}
