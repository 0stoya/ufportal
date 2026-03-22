"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Smartphone } from "lucide-react";

// --- Types ---
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

// --- Constants ---
const DISMISS_KEY = "pwa_install_dismissed_until";
const DISMISS_PERIOD_DAYS = 14;

// --- Helpers ---

// Check if currently running in PWA mode
function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSStandalone = "standalone" in window.navigator && (window.navigator as any).standalone;
  return isStandalone || !!isIOSStandalone;
}

// Check if device is iOS (for specific instructions)
function getIsIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. If already in standalone mode (installed & open), strictly do not show
    if (getIsStandalone()) return;

    // 2. Check if user dismissed it recently
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    // 3. Detect Platform
    const ios = getIsIOS();
    setIsIOS(ios);

    // 4. Handle Android/Desktop (Event-based)
    // If the app is already installed, this event generally WON'T fire.
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    // 5. Handle iOS (Logic-based)
    // iOS doesn't fire the event. We show it if they are on iOS and not in standalone.
    if (ios) {
      // Small delay to ensure render doesn't feel jarring
      setTimeout(() => setIsVisible(true), 2000);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    
    // If they accepted, hide it forever (or until they uninstall and clear cache)
    if (outcome === "accepted") {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Snooze for X days
    const until = Date.now() + DISMISS_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-4 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Smartphone className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-bold text-slate-900 text-sm leading-tight">
              Install App
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {isIOS 
                ? "Add to Home Screen for a full-screen experience." 
                : "Install for faster access and better performance."
              }
            </p>

            {/* Platform Specific Actions */}
            <div className="mt-3">
              {isIOS ? (
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                  <span>Tap</span>
                  <Share className="w-4 h-4" />
                  <span>then</span>
                  <span className="font-semibold">Add to Home Screen</span>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}