import React, { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnimationItem } from "lottie-web";

type Pose = "wave" | "reading" | "listening" | "teaching" | "cheer";
const animations = new Map<Pose, Promise<object>>();
function loadAnimation(pose: Pose) {
  let pending = animations.get(pose);
  if (!pending) {
    pending = fetch(new URL(`assets/mascots/parrot/${pose}.json`, document.baseURI))
      .then((response) => {
        if (!response.ok) throw new Error(`Mascot: ${response.status}`);
        return response.json() as Promise<object>;
      }).catch((error: unknown) => { animations.delete(pose); throw error; });
    animations.set(pose, pending);
  }
  return pending;
}

export function Mascot({ pose, className = "" }: { pose: Pose; className?: string }) {
  // A pose change creates a fresh player, including its loading and playback state.
  return <MascotPlayer key={pose} pose={pose} className={className} />;
}

function MascotPlayer({ pose, className }: { pose: Pose; className: string }) {
  const container = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const surface = container.current;
    if (!surface) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let player: AnimationItem | undefined;
    let disposed = false, visible = false, started = false, loaded = false;
    const sync = () => {
      if (!loaded) return;
      if (visible && !document.hidden && !motion.matches) player?.play();
      else player?.pause();
    };
    const start = async () => {
      if (started || motion.matches) return;
      started = true;
      try {
        const [module, data] = await Promise.all([import("lottie-web/build/player/lottie_light"), loadAnimation(pose)]);
        if (disposed) return;
        player = module.default.loadAnimation({
          container: surface, renderer: "svg", loop: true, autoplay: false,
          // Lottie normalizes paths in place; each instance needs its own data.
          animationData: structuredClone(data),
          rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: false },
        });
        player.addEventListener("DOMLoaded", () => {
          if (disposed) return;
          loaded = true;
          setReady(true);
          sync();
        });
        player.addEventListener("data_failed", () => {
          loaded = false;
          setReady(false);
          player?.destroy();
          player = undefined;
        });
      } catch {
        player?.destroy();
        player = undefined;
        // The transparent poster remains visible when loading fails.
      }
    };
    const onMotion = () => {
      if (motion.matches) player?.goToAndStop(0, true);
      else if (visible) void start();
      sync();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .15;
      if (visible) void start();
      sync();
    }, { threshold: [0, .15] });
    observer.observe(surface);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      observer.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", sync);
      player?.destroy();
    };
  }, [pose]);

  return (
    <span className={`page-mascot ${className}`} data-pose={pose}
      data-animation-ready={ready} aria-hidden="true">
      <img className="mascot-poster" src={`assets/mascots/parrot/${pose}.webp`}
        width="384" height="384" alt="" hidden={ready} />
      <span className="mascot-animation" ref={container} aria-hidden="true" />
    </span>
  );
}

export function PageIntro({ pose, children, className = "" }: { pose: Pose; children: ReactNode; className?: string }) {
  return <div className={`page-intro page-intro--${pose} ${className}`}>
    <Mascot pose={pose} className="intro-mascot" />
    {children}
  </div>;
}
