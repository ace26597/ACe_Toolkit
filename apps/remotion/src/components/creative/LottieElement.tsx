import React, { useEffect, useState } from "react";
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import {
  cancelRender,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

interface LottieElementProps {
  src: string; // URL to Lottie JSON
  loop?: boolean;
  playbackRate?: number;
  style?: React.CSSProperties;
  // Animation entrance
  animation?: "fadeIn" | "scale" | "slideUp" | "none";
  delay?: number;
}

export const LottieElement: React.FC<LottieElementProps> = ({
  src,
  loop = true,
  playbackRate = 1,
  style,
  animation = "none",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [handle] = useState(() => delayRender("Loading Lottie animation"));
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setAnimationData(json);
        continueRender(handle);
      })
      .catch((err) => {
        setError(err.message);
        cancelRender(err);
      });
  }, [src, handle]);

  if (error || !animationData) {
    return null;
  }

  // Calculate entrance animation
  let opacity = 1;
  let transform = "none";

  if (animation !== "none") {
    const progress = spring({
      frame: frame - delay,
      fps,
      config: { damping: 200 },
    });

    opacity = progress;

    switch (animation) {
      case "scale":
        transform = `scale(${interpolate(progress, [0, 1], [0.5, 1])})`;
        break;
      case "slideUp":
        transform = `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`;
        break;
      case "fadeIn":
      default:
        break;
    }
  }

  return (
    <div style={{ opacity, transform, ...style }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        playbackRate={playbackRate}
      />
    </div>
  );
};

// Pre-defined Lottie animation URLs from LottieFiles (free to use)
export const LOTTIE_PRESETS = {
  // Tech/AI themed
  robot: "https://lottie.host/f13e9f32-4d14-4b84-a7be-5b8c1a3f6f7e/TwHh8nHaHZ.json",
  brain: "https://lottie.host/2c9bc7f9-ca3a-4d25-a6d8-c49f2d7fc2b1/vVlxVQz1wP.json",
  code: "https://lottie.host/5bb15dc3-2e5f-4b5f-9a9c-7d8c8c8c8c8c/coding.json",

  // Attention grabbers
  confetti: "https://lottie.host/ff5a9c39-2d6d-43c0-a9c8-9d8c8c8c8c8c/confetti.json",
  sparkle: "https://lottie.host/a1b2c3d4-e5f6-7890-abcd-ef1234567890/sparkle.json",
  fire: "https://lottie.host/1234abcd-5678-90ef-ghij-klmnopqrstuv/fire.json",

  // Social/CTA
  like: "https://lottie.host/hearts-animation/like.json",
  subscribe: "https://lottie.host/subscribe-bell/bell.json",
  arrow: "https://lottie.host/arrow-down/arrow.json",

  // Business/Charts
  chart: "https://lottie.host/chart-growing/chart.json",
  success: "https://lottie.host/success-check/check.json",
  loading: "https://lottie.host/loading-dots/dots.json",
};
