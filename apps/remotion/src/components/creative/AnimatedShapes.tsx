import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Circle, Rect, Triangle, Star, Pie } from "@remotion/shapes";
import { evolvePath } from "@remotion/paths";
import { makeCircle, makeRect, makeStar } from "@remotion/shapes";

interface AnimatedShapeProps {
  shape: "circle" | "rect" | "triangle" | "star" | "pie";
  size?: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  animation?: "draw" | "scale" | "rotate" | "pulse" | "bounce";
  duration?: number;
  delay?: number;
  style?: React.CSSProperties;
}

export const AnimatedShape: React.FC<AnimatedShapeProps> = ({
  shape,
  size = 100,
  color = "#8b5cf6",
  stroke,
  strokeWidth = 0,
  animation = "scale",
  duration = 30,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate animation progress
  const springProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const linearProgress = interpolate(
    frame - delay,
    [0, duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Animation transforms
  let transform = "";
  let opacity = 1;
  let drawProps: { strokeDasharray?: string; strokeDashoffset?: number } = {};

  switch (animation) {
    case "scale":
      transform = `scale(${springProgress})`;
      break;
    case "rotate":
      transform = `rotate(${interpolate(frame, [0, 90], [0, 360])}deg) scale(${springProgress})`;
      break;
    case "pulse":
      const pulseScale = 1 + Math.sin((frame - delay) * 0.2) * 0.1;
      transform = `scale(${springProgress * pulseScale})`;
      break;
    case "bounce":
      const bounceY = Math.abs(Math.sin((frame - delay) * 0.15)) * 20;
      transform = `translateY(${-bounceY}px) scale(${springProgress})`;
      break;
    case "draw":
      // For draw animation, we need the path
      opacity = 1;
      let pathD = "";
      if (shape === "circle") {
        pathD = makeCircle({ radius: size / 2 }).path;
      } else if (shape === "rect") {
        pathD = makeRect({ width: size, height: size }).path;
      } else if (shape === "star") {
        pathD = makeStar({ points: 5, innerRadius: size * 0.4, outerRadius: size / 2 }).path;
      }
      if (pathD) {
        const evolution = evolvePath(linearProgress, pathD);
        drawProps = {
          strokeDasharray: evolution.strokeDasharray,
          strokeDashoffset: evolution.strokeDashoffset,
        };
      }
      break;
  }

  const containerStyle: React.CSSProperties = {
    transform,
    opacity: animation === "draw" ? opacity : springProgress,
    display: "inline-flex",
    ...style,
  };

  const shapeProps = {
    fill: animation === "draw" ? "none" : color,
    stroke: animation === "draw" ? color : stroke,
    strokeWidth: animation === "draw" ? 3 : strokeWidth,
    ...drawProps,
  };

  return (
    <div style={containerStyle}>
      {shape === "circle" && <Circle radius={size / 2} {...shapeProps} />}
      {shape === "rect" && <Rect width={size} height={size} {...shapeProps} />}
      {shape === "triangle" && <Triangle length={size} direction="up" {...shapeProps} />}
      {shape === "star" && (
        <Star points={5} innerRadius={size * 0.4} outerRadius={size / 2} {...shapeProps} />
      )}
      {shape === "pie" && <Pie radius={size / 2} progress={linearProgress} {...shapeProps} />}
    </div>
  );
};

// Floating particles/shapes background
interface FloatingParticlesProps {
  count?: number;
  shapes?: Array<"circle" | "star" | "triangle">;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  speed?: number;
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 20,
  shapes = ["circle", "star"],
  colors = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899"],
  minSize = 10,
  maxSize = 30,
  speed = 1,
}) => {
  const frame = useCurrentFrame();

  // Generate deterministic particles based on index
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = i * 137.5; // Golden angle for distribution
      return {
        x: (seed * 7) % 100,
        y: (seed * 11) % 100,
        size: minSize + ((seed * 13) % (maxSize - minSize)),
        shape: shapes[i % shapes.length],
        color: colors[i % colors.length],
        speedX: ((seed * 17) % 2 - 1) * 0.5,
        speedY: ((seed * 19) % 2 - 1) * 0.3,
        rotation: (seed * 23) % 360,
      };
    });
  }, [count, shapes, colors, minSize, maxSize]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const x = (p.x + frame * p.speedX * speed * 0.1) % 110 - 5;
        const y = (p.y + frame * p.speedY * speed * 0.1) % 110 - 5;
        const rotation = p.rotation + frame * speed * 0.5;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: `rotate(${rotation}deg)`,
              opacity: 0.3,
            }}
          >
            {p.shape === "circle" && <Circle radius={p.size / 2} fill={p.color} />}
            {p.shape === "star" && (
              <Star points={5} innerRadius={p.size * 0.4} outerRadius={p.size / 2} fill={p.color} />
            )}
            {p.shape === "triangle" && <Triangle length={p.size} direction="up" fill={p.color} />}
          </div>
        );
      })}
    </div>
  );
};

// Animated progress/stat visualization
interface AnimatedStatProps {
  value: number;
  maxValue?: number;
  label?: string;
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  delay?: number;
}

export const AnimatedStat: React.FC<AnimatedStatProps> = ({
  value,
  maxValue = 100,
  label,
  color = "#8b5cf6",
  backgroundColor = "#1f2937",
  textColor = "#ffffff",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 50 },
  });

  const displayValue = Math.round(value * progress);
  const barWidth = (value / maxValue) * 100 * progress;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          color: textColor,
          fontSize: 24,
          fontWeight: 600,
        }}
      >
        <span>{label}</span>
        <span style={{ color }}>{displayValue}%</span>
      </div>
      <div
        style={{
          width: "100%",
          height: 16,
          backgroundColor,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 8,
            transition: "none",
          }}
        />
      </div>
    </div>
  );
};
