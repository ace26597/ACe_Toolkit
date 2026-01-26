import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { evolvePath } from "@remotion/paths";

interface DrawingPathProps {
  path: string; // SVG path d attribute
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  duration?: number; // frames to complete drawing
  delay?: number;
  style?: React.CSSProperties;
}

export const DrawingPath: React.FC<DrawingPathProps> = ({
  path,
  stroke = "#ffffff",
  strokeWidth = 3,
  fill = "none",
  duration = 60,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  // Calculate progress (0 to 1)
  const progress = interpolate(
    frame - delay,
    [0, duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const evolution = evolvePath(progress, path);

  return (
    <svg style={{ width: "100%", height: "100%", ...style }}>
      <path
        d={path}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={evolution.strokeDasharray}
        strokeDashoffset={evolution.strokeDashoffset}
      />
    </svg>
  );
};

// Component for drawing multiple paths sequentially
interface MultiPathDrawingProps {
  paths: Array<{
    d: string;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
  }>;
  durationPerPath?: number;
  delayBetween?: number;
  startDelay?: number;
  style?: React.CSSProperties;
}

export const MultiPathDrawing: React.FC<MultiPathDrawingProps> = ({
  paths,
  durationPerPath = 30,
  delayBetween = 5,
  startDelay = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  return (
    <svg style={{ width: "100%", height: "100%", ...style }}>
      {paths.map((pathData, index) => {
        const pathDelay = startDelay + index * (durationPerPath + delayBetween);
        const progress = interpolate(
          frame - pathDelay,
          [0, durationPerPath],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const evolution = evolvePath(progress, pathData.d);

        return (
          <path
            key={index}
            d={pathData.d}
            stroke={pathData.stroke || "#ffffff"}
            strokeWidth={pathData.strokeWidth || 3}
            fill={pathData.fill || "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={evolution.strokeDasharray}
            strokeDashoffset={evolution.strokeDashoffset}
          />
        );
      })}
    </svg>
  );
};

// Pre-defined SVG paths for common icons/shapes
export const SVG_PATHS = {
  // Checkmark
  check: "M 10 50 L 40 80 L 90 20",

  // X mark
  cross: "M 20 20 L 80 80 M 80 20 L 20 80",

  // Arrow right
  arrowRight: "M 10 50 L 80 50 M 60 30 L 80 50 L 60 70",

  // Arrow up
  arrowUp: "M 50 90 L 50 20 M 30 40 L 50 20 L 70 40",

  // Lightbulb outline
  lightbulb: "M 50 10 C 25 10 10 30 10 50 C 10 65 20 75 35 85 L 35 95 L 65 95 L 65 85 C 80 75 90 65 90 50 C 90 30 75 10 50 10 M 35 95 L 65 95",

  // Star outline
  star: "M 50 5 L 61 39 L 98 39 L 68 63 L 79 98 L 50 75 L 21 98 L 32 63 L 2 39 L 39 39 Z",

  // Heart outline
  heart: "M 50 88 C 20 60 5 40 15 25 C 25 10 45 15 50 30 C 55 15 75 10 85 25 C 95 40 80 60 50 88 Z",

  // Simple brain/idea
  brain: "M 30 50 C 30 30 45 20 55 25 C 60 15 80 20 80 35 C 90 40 90 55 80 60 C 85 75 70 85 55 80 C 45 90 25 80 25 65 C 15 60 15 45 30 50",

  // Code brackets
  codeBrackets: "M 30 20 L 15 50 L 30 80 M 70 20 L 85 50 L 70 80",

  // Rocket
  rocket: "M 50 10 C 30 30 30 60 35 75 L 50 65 L 65 75 C 70 60 70 30 50 10 M 35 75 L 25 90 L 40 80 M 65 75 L 75 90 L 60 80",

  // Simple chart/graph
  chart: "M 10 90 L 10 10 M 10 90 L 90 90 M 20 70 L 20 50 M 40 70 L 40 30 M 60 70 L 60 45 M 80 70 L 80 20",
};

// Whiteboard-style drawing scene component
interface WhiteboardSceneProps {
  icon?: keyof typeof SVG_PATHS;
  customPath?: string;
  text?: string;
  stroke?: string;
  backgroundColor?: string;
  textColor?: string;
  iconSize?: number;
}

export const WhiteboardScene: React.FC<WhiteboardSceneProps> = ({
  icon,
  customPath,
  text,
  stroke = "#333333",
  backgroundColor = "#f5f5dc", // Cream/whiteboard color
  textColor = "#333333",
  iconSize = 200,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pathToUse = customPath || (icon ? SVG_PATHS[icon] : SVG_PATHS.check);

  // Text fade in after icon is drawn
  const textOpacity = spring({
    frame: frame - 60,
    fps,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      <div style={{ width: iconSize, height: iconSize }}>
        <DrawingPath
          path={pathToUse}
          stroke={stroke}
          strokeWidth={4}
          duration={50}
          delay={10}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      {text && (
        <div
          style={{
            opacity: textOpacity,
            color: textColor,
            fontSize: 48,
            fontWeight: 700,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};
