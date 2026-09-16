export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "raseed-install-dismissed";

declare global {
  interface Window {
    __raseedInstall?: BeforeInstallPromptEvent;
  }
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let capturing = false;

function notify() {
  listeners.forEach((l) => l());
}

function adopt(e: BeforeInstallPromptEvent | undefined) {
  if (!e) return;
  deferred = e;
  if (typeof window !== "undefined") window.__raseedInstall = e;
  notify();
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function installDismissed() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissInstall() {
  sessionStorage.setItem(DISMISS_KEY, "1");
  notify();
}

export function getDeferredInstall() {
  if (!deferred && typeof window !== "undefined") {
    deferred = window.__raseedInstall ?? null;
  }
  return deferred;
}

export function subscribeInstall(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function captureInstallPrompt() {
  if (typeof window === "undefined") return () => undefined;
  adopt(window.__raseedInstall);
  if (capturing) return () => undefined;
  capturing = true;
  const onPrompt = (e: Event) => {
    e.preventDefault();
    adopt(e as BeforeInstallPromptEvent);
  };
  const onInstalled = () => {
    deferred = null;
    window.__raseedInstall = undefined;
    sessionStorage.setItem(DISMISS_KEY, "1");
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
    capturing = false;
  };
}

export async function promptNativeInstall() {
  const event = getDeferredInstall();
  if (!event) return "unavailable" as const;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null;
  if (typeof window !== "undefined") window.__raseedInstall = undefined;
  if (outcome === "accepted") {
    sessionStorage.setItem(DISMISS_KEY, "1");
  }
  notify();
  return outcome;
}

export function registerBookerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve();
  }
  return navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}
