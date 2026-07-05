"use client";

import { useRef, useState } from "react";
import HeroArch from "../components/HeroArch";
import ConvictionCard from "../components/ConvictionCard";
import AnalysisReport from "../components/AnalysisReport";
import TierLadder from "../components/TierLadder";
import MintFlow from "../components/MintFlow";

export default function Home() {
  const [handle, setHandle] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, width: 360 }}>
            <button className="ghost-button" onClick={handleSave}>
              save card
            </button>
            <MintFlow appId={process.env.NEXT_PUBLIC_CIRCLE_APP_ID} />
          </div>

          <AnalysisReport analysis={result.analysis} />
        </div>
      )}
    </main>
  );
}
