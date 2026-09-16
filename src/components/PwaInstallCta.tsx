"use client";

import { useEffect, useState } from "react";
import {
  dismissInstall,
  getDeferredInstall,
  installDismissed,
  isIosDevice,
  isStandalone,
  promptNativeInstall,
  registerBookerServiceWorker,
  subscribeInstall,
} from "@/lib/pwaInstall";

export function PwaInstallCta({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setStandalone(isStandalone());
      setIos(isIosDevice());
      setCanNative(Boolean(getDeferredInstall()));
    };
    sync();
    void registerBookerServiceWorker();
    return subscribeInstall(sync);
  }, []);

  useEffect(() => {
    if (compact) return;
    if (standalone || installDismissed()) return;
    const phone =
      ios ||
      /Mobile|Android/i.test(navigator.userAgent) ||
      window.matchMedia("(max-width: 820px)").matches;
    if (!phone) return;
    const t = window.setTimeout(() => setOpen(true), canNative || ios ? 200 : 600);
    return () => window.clearTimeout(t);
  }, [compact, standalone, canNative, ios]);

  if (standalone) return null;

  async function install() {
    setBusy(true);
    setHint(null);
    if (ios) {
      setBusy(false);
      setOpen(true);
      setHint("Safari: tap Share, then Add to Home Screen.");
      return;
    }
    const outcome = await promptNativeInstall();
    setBusy(false);
    if (outcome === "accepted") {
      setOpen(false);
      return;
    }
    if (outcome === "dismissed") return;
    setOpen(true);
    setHint(
      ios
        ? "Safari: tap Share, then Add to Home Screen."
        : "Chrome: tap the menu (⋮), then Install app / Add to Home screen. The system prompt only appears after the app is installable (HTTPS or localhost, with this page kept open a moment).",
    );
  }

  function notNow() {
    dismissInstall();
    setOpen(false);
  }

  const sheet = open ? (
    <>
      <button
        type="button"
        className="scrim is-open"
        aria-label="Dismiss install"
        onClick={notNow}
      />
      <div className="sheet is-open" role="dialog" aria-modal aria-labelledby="pwa-install-title">
        <div className="grab" />
        <div className="sheet-h">
          <h2 id="pwa-install-title" className="h3s">
            Add Raseed to this phone
          </h2>
        </div>
        <p className="muted" style={{ fontSize: 14 }}>
          Booker orders and collections in one tap. Install the app — no browser menu.
        </p>
        {ios || !canNative || hint ? (
          <p className="meta" style={{ marginTop: 10 }}>
            {hint ??
              (ios
                ? "Tap Share, then Add to Home Screen. Open Raseed from the home screen next time."
                : "Tap Install and confirm the system prompt. If it has not appeared yet, wait a moment and tap again.")}
          </p>
        ) : null}
        <div className="stack" style={{ gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="btn-primary btn-block"
            onClick={install}
            disabled={busy}
          >
            {busy ? "Opening…" : "Install booker app"}
          </button>
          <button type="button" className="btn-ghost btn-block" onClick={notNow}>
            Not now
          </button>
        </div>
      </div>
    </>
  ) : null;

  if (compact) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <button type="button" className="btn-sec btn-sm" onClick={() => setOpen(true)}>
          Install booker app
        </button>
        {sheet}
      </div>
    );
  }

  return sheet;
}
