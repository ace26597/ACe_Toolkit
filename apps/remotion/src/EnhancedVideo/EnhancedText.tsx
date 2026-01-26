import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring, Easing } from "remotion";
import { TimingConfig } from "./types";

interface EnhancedTextProps {
  text: string;
  emphasis?: string[];
  animation: "fadeIn" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "typewriter" | "bounce" | "blur";
  timing: TimingConfig;
  delay?: number;
  style?: React.CSSProperties;
  accentColor?: string;
}

export const EnhancedText: React.FC<EnhancedTextProps> = ({
  text,
  emphasis = [],
  animation,
  timing,
  delay = 0,
  style = {},
  accentColor = "#8b5cf6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate animation progress based on timing type
  const getProgress = (): number => {
    const delayedFrame = frame - delay;
    if (delayedFrame < 0) return 0;

    switch (timing.type) {
      case "spring":
        return spring({
          frame: delayedFrame,
          fps,
          config: {
            damping: timing.damping ?? 200,
            stiffness: timing.stiffness ?? 100,
            mass: timing.mass ?? 1,
          },
        });

      case "easing":
        const duration = timing.durationFrames ?? 30;
        const easingFn = getEasingFunction(timing.easing);
        return interpolate(delayedFrame, [0, duration], [0, 1], {
          easing: easingFn,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

      case "linear":
      default:
        const linDuration = timing.durationFrames ?? 30;
        return interpolate(delayedFrame, [0, linDuration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
    }
  };

  const progress = getProgress();

  // Calculate animation styles
  const getAnimationStyle = (): React.CSSProperties => {
    switch (animation) {
      case "fadeIn":
        return { opacity: progress };

      case "slideUp":
        return {
          opacity: progress,
          transform: `translateY(${interpolate(progress, [0, 1], [60, 0])}px)`,
        };

      case "slideDown":
        return {
          opacity: progress,
          transform: `translateY(${interpolate(progress, [0, 1], [-60, 0])}px)`,
        };

      case "slideLeft":
        return {
          opacity: progress,
          transform: `translateX(${interpolate(progress, [0, 1], [60, 0])}px)`,
        };

      case "slideRight":
        return {
          opacity: progress,
          transform: `translateX(${interpolate(progress, [0, 1], [-60, 0])}px)`,
        };

      case "scale":
        return {
          opacity: progress,
          transform: `scale(${interpolate(progress, [0, 1], [0.7, 1])})`,
        };

      case "bounce":
        // Overshoot and settle
        const bounceScale = interpolate(progress, [0, 0.6, 1], [0.5, 1.1, 1]);
        return {
          opacity: Math.min(progress * 2, 1),
          transform: `scale(${bounceScale})`,
        };

      case "blur":
        const blur = interpolate(progress, [0, 1], [10, 0]);
        return {
          opacity: progress,
          filter: `blur(${blur}px)`,
        };

      case "typewriter":
        // Handled separately in render
        return { opacity: 1 };

      default:
        return { opacity: progress };
    }
  };

  // Highlight emphasized words
  const renderTextWithEmphasis = (content: string) => {
    if (emphasis.length === 0) return content;

    let result: (string | React.ReactNode)[] = [content];

    emphasis.forEach((word, idx) => {
      result = result.flatMap((part) => {
        if (typeof part !== "string") return part;

        const regex = new RegExp(`(${word})`, "gi");
        const parts = part.split(regex);

        return parts.map((p, i) =>
          regex.test(p) ? (
            <span key={`${idx}-${i}`} style={{ color: accentColor, fontWeight: "bold" }}>
              {p}
            </span>
          ) : (
            p
          )
        );
      });
    });

    return result;
  };

  // Typewriter animation
  if (animation === "typewriter") {
    const visibleChars = Math.floor(progress * text.length);
    return (
      <span style={{ display: "block", ...style }}>
        {renderTextWithEmphasis(text.slice(0, visibleChars))}
        <span style={{ opacity: 0 }}>{text.slice(visibleChars)}</span>
      </span>
    );
  }

  return (
    <span style={{ display: "block", ...getAnimationStyle(), ...style }}>
      {renderTextWithEmphasis(text)}
    </span>
  );
};

// Helper to get easing function
function getEasingFunction(easing?: string) {
  switch (easing) {
    case "quad":
      return Easing.inOut(Easing.quad);
    case "sin":
      return Easing.inOut(Easing.sin);
    case "exp":
      return Easing.inOut(Easing.exp);
    case "circle":
      return Easing.inOut(Easing.circle);
    default:
      return Easing.inOut(Easing.quad);
  }
}
