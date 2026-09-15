export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "raseed-install-dismissed";

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
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

export function isBookerSurface() {
  if (typeof window === "undefined") return false;
  return isStandalone() || window.matchMedia("(max-width: 820px)").matches;
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
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    sessionStorage.setItem(DISMISS_KEY, "1");
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export async function promptNativeInstall() {
  if (!deferred) return "unavailable" as const;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  if (outcome === "accepted") {
    sessionStorage.setItem(DISMISS_KEY, "1");
  }
  notify();
  return outcome;
}
