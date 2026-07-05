"use client";

import { useState } from "react";

export default function MintFlow({ handle }) {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleMint() {
    setLoading(true);
    setIsError(false);
    setStatus("Minting your badge...");

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setIsError(true);
        setStatus(data.error || "Mint failed.");
        return;
      }

      setDone(true);
      setStatus(`Minted to ${data.address.slice(0, 6)}...${data.address.slice(-4)}`);
    } catch (err) {
      setIsError(true);
      setStatus("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: 360 }}>
      <button className="ghost-button" onClick={handleMint} disabled={loading || done} style={{ width: "100%" }}>
        {done ? "minted" : loading ? "minting..." : "mint on testnet"}
      </button>
      {status && (
        <p className="cooldown-note" style={{ margin: "10px 0 0", color: isError ? "#f0997b" : undefined }}>
          {status}
        </p>
      )}
    </div>
  );
}
