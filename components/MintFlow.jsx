"use client";

import { useEffect, useRef, useState } from "react";

export default function MintFlow({ appId }) {
  const sdkRef = useRef(null);
  const loginResultRef = useRef(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initSdk() {
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");

      const onLoginComplete = (error, result) => {
        if (cancelled) return;
        if (error || !result) {
          setIsError(true);
          setStatus(error?.message || "Email verification failed. Try again.");
          return;
        }
        loginResultRef.current = { userToken: result.userToken, encryptionKey: result.encryptionKey };
        continueAfterLogin();
      };

      const sdk = new W3SSdk({ appSettings: { appId } }, onLoginComplete);
      sdkRef.current = sdk;

      const cachedDeviceId = window.localStorage.getItem("arc_circle_device_id");
      if (cachedDeviceId) {
        setDeviceId(cachedDeviceId);
      } else {
        const id = await sdk.getDeviceId();
        window.localStorage.setItem("arc_circle_device_id", id);
        if (!cancelled) setDeviceId(id);
      }

      if (!cancelled) setSdkReady(true);
    }

    initSdk().catch(() => {
      if (!cancelled) {
        setIsError(true);
        setStatus("Couldn't load the wallet SDK.");
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function circleAction(action, params) {
    const res = await fetch("/api/circle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params })
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || data.message || "Request failed");
      err.code = data.code;
      throw err;
    }
    return data;
  }

  async function handleStartMint() {
    setIsError(false);
    setDone(false);
    if (!showEmailInput) {
      setShowEmailInput(true);
      setStatus("Enter your email to mint your badge.");
      return;
    }
    if (!email.trim()) {
      setIsError(true);
      setStatus("Enter an email address first.");
      return;
    }

    try {
      setStatus("Sending you a code...");
      const otpData = await circleAction("requestEmailOtp", { deviceId, email: email.trim() });

      sdkRef.current.updateConfigs({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: otpData.deviceToken,
          deviceEncryptionKey: otpData.deviceEncryptionKey,
          otpToken: otpData.otpToken,
          email: { email: email.trim() }
        }
      });

      setStatus("Check your email for the code, then confirm the popup.");
      sdkRef.current.verifyOtp();
    } catch (err) {
      setIsError(true);
      setStatus(err.message);
    }
  }

  async function continueAfterLogin() {
    const { userToken } = loginResultRef.current;

    try {
      setIsError(false);
      setStatus("Setting up your wallet...");

      let challengeId = null;
      try {
        const initData = await circleAction("initializeUser", { userToken });
        challengeId = initData.challengeId;
      } catch (err) {
        if (err.code === 155106) {
          await finishMint(userToken);
          return;
        }
        throw err;
      }

      sdkRef.current.setAuthentication(loginResultRef.current);
      setStatus("Confirm the popup to finish setting up your wallet...");

      sdkRef.current.execute(challengeId, async (error) => {
        if (error) {
          setIsError(true);
          setStatus(error.message || "Wallet setup was cancelled.");
          return;
        }
        await finishMint(userToken);
      });
    } catch (err) {
      setIsError(true);
      setStatus(err.message);
    }
  }

  async function finishMint(userToken) {
    try {
      setStatus("Minting your badge...");
      const mintData = await circleAction("mintBadge", { userToken });
      setDone(true);
      setIsError(false);
      setStatus(`Minted to ${mintData.address.slice(0, 6)}...${mintData.address.slice(-4)}`);
    } catch (err) {
      setIsError(true);
      setStatus(err.message);
    }
  }

  return (
    <div style={{ width: 360 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {showEmailInput && !done && (
          <input
            className="scan-input"
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)" }}
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <button
          className="ghost-button"
          onClick={handleStartMint}
          disabled={!sdkReady}
          style={{ flex: showEmailInput ? "none" : 1, minWidth: 140 }}
        >
          {done ? "minted" : showEmailInput ? "send code" : "mint on testnet"}
        </button>
      </div>
      {status && (
        <p className="cooldown-note" style={{ margin: "10px 0 0", color: isError ? "#f0997b" : undefined }}>
          {status}
        </p>
      )}
    </div>
  );
}
