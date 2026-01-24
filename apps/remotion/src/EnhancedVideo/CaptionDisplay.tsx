import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { Caption } from "@remotion/captions";

export interface CaptionStyle {
  position: "bottom" | "middle" | "top";
  fontSize: number;
  fontFamily?: string;
  textColor: string;
  highlightColor: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  animation: "none" | "bounce" | "pop" | "slide" | "fade";
  maxWidth?: number;
}

export interface CaptionPage {
  text: string;
  startMs: number;
  endMs: number;
  tokens: CaptionToken[];
}

export interface CaptionToken {
  text: string;
  startMs: number;
  endMs: number;
}

interface CaptionDisplayProps {
  captions: Caption[];
  pages?: CaptionPage[];
  style: CaptionStyle;
  currentTimeMs?: number; // Override for testing
}

const defaultStyle: CaptionStyle = {
  position: "bottom",
  fontSize: 48,
  fontFamily: "Inter, sans-serif",
  textColor: "#ffffff",
  highlightColor: "#facc15", // yellow
  backgroundColor: "rgba(0,0,0,0.6)",
  backgroundOpacity: 0.6,
  animation: "bounce",
  maxWidth: 900,
};

/**
 * TikTok-style caption display with word highlighting
 * Uses @remotion/captions Caption type
 */
export const CaptionDisplay: React.FC<CaptionDisplayProps> = ({
  captions,
  pages,
  style: propStyle,
  currentTimeMs: overrideTime,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = { ...defaultStyle, ...propStyle };

  // Current time in milliseconds
  const currentTimeMs = overrideTime ?? (frame / fps) * 1000;

  // If pages are provided, use them; otherwise, show individual captions
  if (pages && pages.length > 0) {
    return (
      <PagedCaptions
        pages={pages}
        style={style}
        currentTimeMs={currentTimeMs}
        fps={fps}
        frame={frame}
      />
    );
  }

  // Find currently active caption
  const activeCaption = captions.find(
    (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs
  );

  if (!activeCaption) return null;

  return (
    <SingleCaption
      caption={activeCaption}
      style={style}
      currentTimeMs={currentTimeMs}
      fps={fps}
      frame={frame}
    />
  );
};

/**
 * Paged captions with word-by-word highlighting
 */
const PagedCaptions: React.FC<{
  pages: CaptionPage[];
  style: CaptionStyle;
  currentTimeMs: number;
  fps: number;
  frame: number;
}> = ({ pages, style, currentTimeMs, fps, frame }) => {
  // Find current page
  const currentPage = pages.find(
    (p) => currentTimeMs >= p.startMs && currentTimeMs < p.endMs
  );

  if (!currentPage) return null;

  // Calculate page entrance animation
  const pageStartFrame = Math.floor((currentPage.startMs / 1000) * fps);
  const framesSinceStart = frame - pageStartFrame;

  const entranceProgress = spring({
    frame: framesSinceStart,
    fps,
    config: { damping: 15, stiffness: 150 },
    durationInFrames: 15,
  });

  // Position styles
  const positionStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: `translateX(-50%) translateY(${
      style.animation === "slide"
        ? interpolate(entranceProgress, [0, 1], [30, 0])
        : 0
    }px)`,
    ...(style.position === "bottom" && { bottom: 120 }),
    ...(style.position === "middle" && { top: "50%", marginTop: -50 }),
    ...(style.position === "top" && { top: 120 }),
  };

  const opacity =
    style.animation === "fade"
      ? interpolate(entranceProgress, [0, 1], [0, 1])
      : 1;

  return (
    <div
      style={{
        ...positionStyle,
        opacity,
        maxWidth: style.maxWidth,
        textAlign: "center",
        padding: "16px 24px",
        borderRadius: 12,
        backgroundColor: style.backgroundColor,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 8px",
          lineHeight: 1.4,
        }}
      >
        {currentPage.tokens.map((token, idx) => (
          <WordToken
            key={`${token.text}-${idx}`}
            token={token}
            style={style}
            currentTimeMs={currentTimeMs}
            fps={fps}
            frame={frame}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual word token with highlight animation
 */
const WordToken: React.FC<{
  token: CaptionToken;
  style: CaptionStyle;
  currentTimeMs: number;
  fps: number;
  frame: number;
  index: number;
}> = ({ token, style, currentTimeMs, fps, frame, index }) => {
  const isActive =
    currentTimeMs >= token.startMs && currentTimeMs < token.endMs;
  const isPast = currentTimeMs >= token.endMs;

  // Calculate highlight animation
  const tokenStartFrame = Math.floor((token.startMs / 1000) * fps);
  const framesSinceToken = frame - tokenStartFrame;

  let scale = 1;
  let yOffset = 0;

  if (isActive && style.animation !== "none") {
    if (style.animation === "bounce" || style.animation === "pop") {
      const bounceProgress = spring({
        frame: framesSinceToken,
        fps,
        config: { damping: 8, stiffness: 200 },
        durationInFrames: 10,
      });
      scale = interpolate(bounceProgress, [0, 0.5, 1], [1, 1.15, 1.05]);
      if (style.animation === "bounce") {
        yOffset = interpolate(bounceProgress, [0, 0.5, 1], [0, -8, 0]);
      }
    }
  }

  const color = isActive
    ? style.highlightColor
    : isPast
      ? style.textColor
      : "rgba(255,255,255,0.5)";

  return (
    <span
      style={{
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: isActive ? 800 : 600,
        color,
        transform: `scale(${scale}) translateY(${yOffset}px)`,
        display: "inline-block",
        transition: "color 0.1s ease",
        whiteSpace: "pre",
      }}
    >
      {token.text}
    </span>
  );
};

/**
 * Single caption (non-paged mode)
 */
const SingleCaption: React.FC<{
  caption: Caption;
  style: CaptionStyle;
  currentTimeMs: number;
  fps: number;
  frame: number;
}> = ({ caption, style, currentTimeMs, fps, frame }) => {
  const captionStartFrame = Math.floor((caption.startMs / 1000) * fps);
  const framesSinceStart = frame - captionStartFrame;

  const entranceProgress = spring({
    frame: framesSinceStart,
    fps,
    config: { damping: 15 },
    durationInFrames: 10,
  });

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    ...(style.position === "bottom" && { bottom: 120 }),
    ...(style.position === "middle" && { top: "50%", marginTop: -50 }),
    ...(style.position === "top" && { top: 120 }),
  };

  return (
    <div
      style={{
        ...positionStyle,
        maxWidth: style.maxWidth,
        textAlign: "center",
        padding: "16px 24px",
        borderRadius: 12,
        backgroundColor: style.backgroundColor,
        opacity: interpolate(entranceProgress, [0, 1], [0, 1]),
        transform: `translateX(-50%) translateY(${interpolate(
          entranceProgress,
          [0, 1],
          [20, 0]
        )}px)`,
      }}
    >
      <span
        style={{
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          fontWeight: 600,
          color: style.textColor,
          whiteSpace: "pre-wrap",
        }}
      >
        {caption.text}
      </span>
    </div>
  );
};

/**
 * Helper: Convert Captions to Pages using simple word grouping
 * For TikTok-style, use createTikTokStyleCaptions from @remotion/captions instead
 */
export function captionsToPages(
  captions: Caption[],
  wordsPerPage: number = 4
): CaptionPage[] {
  const pages: CaptionPage[] = [];
  let currentTokens: CaptionToken[] = [];
  let pageStartMs = 0;

  for (const caption of captions) {
    // Each caption becomes a token
    const token: CaptionToken = {
      text: caption.text,
      startMs: caption.startMs,
      endMs: caption.endMs,
    };

    if (currentTokens.length === 0) {
      pageStartMs = caption.startMs;
    }

    currentTokens.push(token);

    // Create page when we hit word limit
    if (currentTokens.length >= wordsPerPage) {
      pages.push({
        text: currentTokens.map((t) => t.text).join(" "),
        startMs: pageStartMs,
        endMs: caption.endMs,
        tokens: [...currentTokens],
      });
      currentTokens = [];
    }
  }

  // Push remaining tokens as final page
  if (currentTokens.length > 0) {
    pages.push({
      text: currentTokens.map((t) => t.text).join(" "),
      startMs: pageStartMs,
      endMs: currentTokens[currentTokens.length - 1].endMs,
      tokens: currentTokens,
    });
  }

  return pages;
}

export default CaptionDisplay;
