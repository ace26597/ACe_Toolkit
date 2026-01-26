import React from "react";
import { useCurrentFrame, Img } from "remotion";
import { AbsoluteFill } from "remotion";

// Animated gradient background
interface GradientBackgroundProps {
  colors: string[];
  type?: "linear" | "radial" | "conic";
  angle?: number; // For linear gradients
  animated?: boolean;
  animationSpeed?: number;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors,
  type = "linear",
  angle = 135,
  animated = true,
  animationSpeed = 1,
}) => {
  const frame = useCurrentFrame();

  const animatedAngle = animated ? angle + frame * animationSpeed : angle;

  let gradient = "";

  switch (type) {
    case "linear":
      gradient = `linear-gradient(${animatedAngle}deg, ${colors.join(", ")})`;
      break;
    case "radial":
      gradient = `radial-gradient(circle at 50% 50%, ${colors.join(", ")})`;
      break;
    case "conic":
      gradient = `conic-gradient(from ${animatedAngle}deg at 50% 50%, ${colors.join(", ")})`;
      break;
  }

  return (
    <AbsoluteFill
      style={{
        background: gradient,
      }}
    />
  );
};

// Pre-defined gradient themes
export const GRADIENT_PRESETS = {
  // Dark themes
  purpleNight: ["#0f0c29", "#302b63", "#24243e"],
  deepOcean: ["#0f2027", "#203a43", "#2c5364"],
  darkPurple: ["#1a0a2e", "#3d1e6d", "#8b5cf6"],
  midnight: ["#0a0a0a", "#1a1a2e", "#16213e"],

  // Vibrant themes
  sunset: ["#ff512f", "#f09819", "#ff512f"],
  neonPink: ["#12c2e9", "#c471ed", "#f64f59"],
  aurora: ["#00c6ff", "#0072ff", "#7c3aed"],
  fire: ["#f12711", "#f5af19"],

  // Soft themes
  peach: ["#ffecd2", "#fcb69f"],
  mint: ["#a8edea", "#fed6e3"],
  lavender: ["#e0c3fc", "#8ec5fc"],

  // Tech themes
  cyber: ["#00d2ff", "#3a7bd5", "#00d2ff"],
  matrix: ["#0a0a0a", "#003300", "#00ff00", "#003300", "#0a0a0a"],
  electric: ["#4776E6", "#8E54E9"],
};

// Mesh gradient background (multiple radial gradients)
interface MeshGradientProps {
  colors: string[];
  animated?: boolean;
}

export const MeshGradient: React.FC<MeshGradientProps> = ({
  colors,
  animated = true,
}) => {
  const frame = useCurrentFrame();

  // Create multiple overlapping radial gradients
  const gradients = colors.map((color, i) => {
    const baseX = 25 + (i % 2) * 50;
    const baseY = 25 + Math.floor(i / 2) * 50;
    const x = animated ? baseX + Math.sin(frame * 0.02 + i) * 10 : baseX;
    const y = animated ? baseY + Math.cos(frame * 0.02 + i * 0.5) * 10 : baseY;

    return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent 50%)`;
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        background: gradients.join(", "),
      }}
    />
  );
};

// Image background with overlay
interface ImageBackgroundProps {
  src: string; // URL or staticFile path
  overlay?: string; // Color with opacity, e.g., "rgba(0,0,0,0.7)"
  blur?: number;
  zoom?: boolean;
  zoomSpeed?: number;
}

export const ImageBackground: React.FC<ImageBackgroundProps> = ({
  src,
  overlay = "rgba(0,0,0,0.5)",
  blur = 0,
  zoom = false,
  zoomSpeed = 0.001,
}) => {
  const frame = useCurrentFrame();

  const scale = zoom ? 1 + frame * zoomSpeed : 1;

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />
      <AbsoluteFill style={{ backgroundColor: overlay }} />
    </AbsoluteFill>
  );
};

// Animated grid/pattern background
interface GridBackgroundProps {
  gridSize?: number;
  lineColor?: string;
  backgroundColor?: string;
  animated?: boolean;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  gridSize = 50,
  lineColor = "rgba(255,255,255,0.1)",
  backgroundColor = "#0a0a0a",
  animated = true,
}) => {
  const frame = useCurrentFrame();

  const offset = animated ? (frame * 0.5) % gridSize : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        backgroundImage: `
          linear-gradient(${lineColor} 1px, transparent 1px),
          linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${offset}px ${offset}px`,
      }}
    />
  );
};

// Particle/dot pattern background
interface DotPatternProps {
  dotSize?: number;
  spacing?: number;
  color?: string;
  backgroundColor?: string;
}

export const DotPattern: React.FC<DotPatternProps> = ({
  dotSize = 2,
  spacing = 30,
  color = "rgba(255,255,255,0.2)",
  backgroundColor = "#0a0a0a",
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        backgroundImage: `radial-gradient(${color} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
      }}
    />
  );
};

// Noise/grain overlay
interface NoiseOverlayProps {
  opacity?: number;
  animated?: boolean;
}

export const NoiseOverlay: React.FC<NoiseOverlayProps> = ({
  opacity = 0.05,
  animated = true,
}) => {
  const frame = useCurrentFrame();

  // Use CSS filter for noise effect
  const seed = animated ? frame : 0;

  return (
    <AbsoluteFill
      style={{
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' seed='${seed}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

// Vignette effect
interface VignetteProps {
  intensity?: number; // 0 to 1
  color?: string;
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.5,
  color = "black",
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, transparent 40%, ${color} ${100 - intensity * 50}%)`,
        pointerEvents: "none",
      }}
    />
  );
};
