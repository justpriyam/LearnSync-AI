"use client";

import React, { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";

export default function ServerWarmingNotice() {
  const [isWarming, setIsWarming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let mounted = true;

    // Trigger health check
    const startTime = Date.now();
    
    // If response takes > 2.5s, display warming notice
    timer = setTimeout(() => {
      if (mounted && !isConnected) {
        setIsWarming(true);
      }
    }, 2500);

    checkHealth()
      .then(() => {
        if (mounted) {
          clearTimeout(timer);
          setIsConnected(true);
          // If the warming notice was shown, display success briefly then fade out
          if (isWarming) {
            setTimeout(() => {
              if (mounted) setDismissed(true);
            }, 3000);
          } else {
            setDismissed(true);
          }
        }
      })
      .catch(() => {
        // Silently keep warming status if still trying
      });

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isConnected, isWarming]);

  if (dismissed || (!isWarming && !isConnected)) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-md transition-all duration-300"
      style={{
        animation: "fadeSlideUp 0.4s ease both",
      }}
    >
      {!isConnected ? (
        <>
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <div className="flex-1 text-xs leading-relaxed text-neutral-300">
            <span className="font-semibold text-amber-400">Connecting to Server:</span>{" "}
            Render free-tier service is waking up (~30-60s on first load).
          </div>
        </>
      ) : (
        <>
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black">
            ✓
          </div>
          <div className="flex-1 text-xs text-neutral-300">
            <span className="font-semibold text-emerald-400">Server Ready:</span> Connected to LearnSync AI API.
          </div>
        </>
      )}
    </div>
  );
}
