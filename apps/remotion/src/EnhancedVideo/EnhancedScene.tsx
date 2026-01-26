import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { EnhancedText } from "./EnhancedText";
import { EnhancedScene as EnhancedSceneType, BackgroundConfig } from "./types";
import {
  GradientBackground,
  MeshGradient,
  ImageBackground,
  GridBackground,
  DotPattern,
  FloatingParticles,
  DrawingPath,
  AnimatedStat,
  SVG_PATHS,
  GRADIENT_PRESETS,
} from "../components/creative";

// Helper to filter out "draw" animation for EnhancedText (which doesn't support it)
const getTextAnimation = (animation: string): "fadeIn" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "typewriter" | "bounce" | "blur" => {
  if (animation === "draw") return "fadeIn";
  return animation as any;
};

// Load Inter font for professional look
const { fontFamily } = loadFont();

interface EnhancedSceneProps {
  scene: EnhancedSceneType;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  globalBackground?: BackgroundConfig;
  globalParticles?: boolean;
  globalParticleColors?: string[];
}

// Render background based on config
const renderBackground = (
  config: BackgroundConfig | undefined,
  fallbackColor: string
): React.ReactNode => {
  if (!config) {
    return <AbsoluteFill style={{ backgroundColor: fallbackColor }} />;
  }

  switch (config.type) {
    case "gradient":
      const colors = config.gradientColors ||
        (config.gradientPreset && GRADIENT_PRESETS[config.gradientPreset]) ||
        [fallbackColor, fallbackColor];
      return (
        <GradientBackground
          colors={colors}
          angle={config.gradientAngle || 135}
          animated={config.animated !== false}
        />
      );
    case "mesh":
      const meshColors = config.gradientColors || ["#8b5cf6", "#06b6d4", "#f59e0b"];
      return <MeshGradient colors={meshColors} animated={config.animated !== false} />;
    case "image":
      if (config.imageUrl) {
        return (
          <ImageBackground
            src={config.imageUrl}
            overlay={config.overlay || "rgba(0,0,0,0.5)"}
            blur={config.blur || 0}
            zoom={config.zoom || false}
          />
        );
      }
      return <AbsoluteFill style={{ backgroundColor: fallbackColor }} />;
    case "grid":
      return (
        <GridBackground
          gridSize={config.gridSize || 50}
          lineColor={config.lineColor || "rgba(255,255,255,0.1)"}
          backgroundColor={config.color || fallbackColor}
          animated={config.animated !== false}
        />
      );
    case "dots":
      return (
        <DotPattern
          spacing={config.gridSize || 30}
          color={config.lineColor || "rgba(255,255,255,0.2)"}
          backgroundColor={config.color || fallbackColor}
        />
      );
    case "solid":
    default:
      return <AbsoluteFill style={{ backgroundColor: config.color || fallbackColor }} />;
  }
};

// Shared container styles (replacing Tailwind className)
const containerStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 48,
  fontFamily,
};

const columnStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: 64,
  fontFamily,
};

export const EnhancedScene: React.FC<EnhancedSceneProps> = ({
  scene,
  backgroundColor,
  textColor,
  accentColor,
  globalBackground,
  globalParticles,
  globalParticleColors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Use scene-specific colors or fall back to global
  const bgColor = scene.backgroundColor || backgroundColor;
  const txtColor = scene.textColor || textColor;
  const accent = scene.accentColor || accentColor;

  // Use scene background or fall back to global
  const sceneBackground = scene.background || globalBackground;

  // Show particles if scene or global has them enabled
  const showParticles = scene.particles || globalParticles;
  const particleColors = scene.particleColors || globalParticleColors || [accent, "#06b6d4", "#f59e0b"];

  switch (scene.type) {
    case "hook":
      return (
        <AbsoluteFill>
          {renderBackground(sceneBackground, bgColor)}
          {showParticles && <FloatingParticles colors={particleColors} count={15} />}
          <div style={{ ...containerStyles, position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", maxWidth: 900 }}>
              {/* Pulse effect for hooks */}
              <div
                style={{
                  transform: `scale(${interpolate(frame % 45, [0, 22, 45], [1, 1.03, 1])})`,
                }}
              >
                <EnhancedText
                  text={scene.text || ""}
                  emphasis={scene.emphasis}
                  animation={getTextAnimation(scene.animation)}
                  timing={scene.timing}
                  accentColor={accent}
                  style={{
                    color: txtColor,
                    fontSize: 72,
                    fontWeight: 900,
                    lineHeight: 1.1,
                  }}
                />
              </div>
            </div>
          </div>
        </AbsoluteFill>
      );

    case "title-card":
      return (
        <AbsoluteFill style={{ backgroundColor: bgColor, ...containerStyles }}>
          <div style={{ textAlign: "center" }}>
            <EnhancedText
              text={scene.title || scene.text || ""}
              emphasis={scene.emphasis}
              animation={getTextAnimation(scene.animation)}
              timing={scene.timing}
              accentColor={accent}
              style={{ color: accent, fontSize: 84, fontWeight: 900 }}
            />
            {scene.text && scene.title && (
              <EnhancedText
                text={scene.text}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 20 }}
                delay={20}
                style={{ color: txtColor, opacity: 0.8, fontSize: 36, marginTop: 32 }}
              />
            )}
          </div>
        </AbsoluteFill>
      );

    case "content":
      return (
        <AbsoluteFill style={{ backgroundColor: bgColor, ...columnStyles }}>
          {scene.title && (
            <EnhancedText
              text={scene.title}
              animation="slideUp"
              timing={{ type: "spring", damping: 200 }}
              accentColor={accent}
              style={{ color: accent, fontSize: 48, fontWeight: 700, marginBottom: 32 }}
            />
          )}
          <EnhancedText
            text={scene.text || ""}
            emphasis={scene.emphasis}
            animation={getTextAnimation(scene.animation)}
            timing={scene.timing}
            delay={scene.title ? 10 : 0}
            accentColor={accent}
            style={{ color: txtColor, fontSize: 36, lineHeight: 1.5 }}
          />
        </AbsoluteFill>
      );

    case "bullet-list":
      return (
        <AbsoluteFill style={{ backgroundColor: bgColor, ...columnStyles }}>
          {scene.title && (
            <EnhancedText
              text={scene.title}
              animation="slideUp"
              timing={{ type: "spring", damping: 200 }}
              accentColor={accent}
              style={{ color: accent, fontSize: 48, fontWeight: 700, marginBottom: 40 }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(scene.bullets || []).map((bullet, index) => {
              const bulletDelay = (scene.staggerDelay || 15) * (index + 1);
              const bulletProgress = spring({
                frame: frame - bulletDelay,
                fps,
                config: { damping: 150 },
              });

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 24,
                    fontSize: 32,
                    opacity: bulletProgress,
                    transform: `translateX(${interpolate(bulletProgress, [0, 1], [-40, 0])}px)`,
                  }}
                >
                  <span style={{ color: accent, fontSize: 36, marginTop: 4 }}>
                    {getBulletIcon(index)}
                  </span>
                  <span style={{ color: txtColor }}>{bullet}</span>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      );

    case "quote":
      return (
        <AbsoluteFill style={{ backgroundColor: bgColor, ...containerStyles, padding: 64 }}>
          <div style={{ maxWidth: 900, textAlign: "center", position: "relative" }}>
            <span
              style={{
                color: accent,
                opacity: 0.3,
                position: "absolute",
                top: -60,
                left: -40,
                fontSize: 120,
                lineHeight: 1,
              }}
            >
              "
            </span>
            <EnhancedText
              text={scene.text || ""}
              emphasis={scene.emphasis}
              animation={getTextAnimation(scene.animation)}
              timing={scene.timing}
              accentColor={accent}
              style={{ color: txtColor, fontSize: 48, fontStyle: "italic", lineHeight: 1.5 }}
            />
            {scene.title && (
              <EnhancedText
                text={`— ${scene.title}`}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 20 }}
                delay={30}
                style={{ color: accent, fontSize: 28, marginTop: 32 }}
              />
            )}
          </div>
        </AbsoluteFill>
      );

    case "cta":
      return (
        <AbsoluteFill style={{ backgroundColor: bgColor, ...containerStyles, flexDirection: "column" }}>
          {renderBackground(sceneBackground, bgColor)}
          {showParticles && <FloatingParticles colors={particleColors} count={15} />}
          <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
            {/* Animated arrow or icon */}
            <div
              style={{
                transform: `translateY(${interpolate(frame % 30, [0, 15, 30], [0, -10, 0])}px)`,
                marginBottom: 24,
                fontSize: 60,
              }}
            >
              👆
            </div>

            <EnhancedText
              text={scene.text || "Follow for more!"}
              emphasis={scene.emphasis}
              animation={getTextAnimation(scene.animation)}
              timing={scene.timing}
              accentColor={accent}
              style={{ color: txtColor, fontSize: 60, fontWeight: 900 }}
            />

            {scene.title && (
              <EnhancedText
                text={scene.title}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 20 }}
                delay={15}
                style={{ color: accent, opacity: 0.8, fontSize: 28, marginTop: 24 }}
              />
            )}

            {/* Pulsing button effect */}
            <div
              style={{
                backgroundColor: accent,
                marginTop: 32,
                paddingLeft: 32,
                paddingRight: 32,
                paddingTop: 16,
                paddingBottom: 16,
                borderRadius: 9999,
                display: "inline-block",
                transform: `scale(${interpolate(frame % 60, [0, 30, 60], [1, 1.05, 1])})`,
              }}
            >
              <span style={{ color: bgColor, fontSize: 24, fontWeight: 700 }}>
                TAP TO FOLLOW
              </span>
            </div>
          </div>
        </AbsoluteFill>
      );

    // ============ CREATIVE SCENE TYPES ============

    case "whiteboard":
      // Whiteboard-style drawing animation
      const iconPath = scene.icon ? SVG_PATHS[scene.icon] :
        (scene.drawingPath?.preset ? SVG_PATHS[scene.drawingPath.preset] :
        scene.drawingPath?.path || SVG_PATHS.check);

      return (
        <AbsoluteFill>
          {renderBackground(sceneBackground, "#f5f5dc")}
          <div style={{ ...containerStyles, flexDirection: "column", gap: 40, position: "relative", zIndex: 1 }}>
            <div style={{ width: 200, height: 200 }}>
              <DrawingPath
                path={iconPath}
                stroke={scene.drawingPath?.stroke || txtColor}
                strokeWidth={scene.drawingPath?.strokeWidth || 4}
                duration={scene.drawingPath?.duration || 50}
                delay={10}
              />
            </div>
            {scene.text && (
              <EnhancedText
                text={scene.text}
                emphasis={scene.emphasis}
                animation="fadeIn"
                timing={{ type: "spring", damping: 200 }}
                delay={60}
                accentColor={accent}
                style={{ color: txtColor, fontSize: 48, fontWeight: 700, textAlign: "center" }}
              />
            )}
          </div>
        </AbsoluteFill>
      );

    case "stats":
      // Animated statistics/progress bars
      return (
        <AbsoluteFill>
          {renderBackground(sceneBackground, bgColor)}
          {showParticles && <FloatingParticles colors={particleColors} count={10} />}
          <div style={{ ...columnStyles, position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto" }}>
            {scene.title && (
              <EnhancedText
                text={scene.title}
                animation="slideUp"
                timing={{ type: "spring", damping: 200 }}
                accentColor={accent}
                style={{ color: accent, fontSize: 48, fontWeight: 700, marginBottom: 48 }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 32, width: "100%" }}>
              {(scene.stats || []).map((stat, index) => (
                <AnimatedStat
                  key={index}
                  label={stat.label}
                  value={stat.value}
                  maxValue={stat.maxValue || 100}
                  color={stat.color || accent}
                  textColor={txtColor}
                  delay={15 + index * 20}
                />
              ))}
            </div>
          </div>
        </AbsoluteFill>
      );

    case "icon-reveal":
      // Icon drawing with text reveal
      const revealIconPath = scene.icon ? SVG_PATHS[scene.icon] : SVG_PATHS.star;
      const iconScale = spring({
        frame: frame - 60,
        fps,
        config: { damping: 15 },
      });

      return (
        <AbsoluteFill>
          {renderBackground(sceneBackground, bgColor)}
          {showParticles && <FloatingParticles colors={particleColors} />}
          <div style={{ ...containerStyles, flexDirection: "column", gap: 32, position: "relative", zIndex: 1 }}>
            <div
              style={{
                width: 150,
                height: 150,
                transform: `scale(${iconScale})`,
              }}
            >
              <DrawingPath
                path={revealIconPath}
                stroke={accent}
                strokeWidth={5}
                duration={45}
                delay={5}
              />
            </div>
            {scene.title && (
              <EnhancedText
                text={scene.title}
                animation="scale"
                timing={{ type: "spring", damping: 15 }}
                delay={50}
                accentColor={accent}
                style={{ color: accent, fontSize: 64, fontWeight: 900 }}
              />
            )}
            {scene.text && (
              <EnhancedText
                text={scene.text}
                emphasis={scene.emphasis}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 20 }}
                delay={70}
                accentColor={accent}
                style={{ color: txtColor, fontSize: 36, textAlign: "center", maxWidth: 800 }}
              />
            )}
          </div>
        </AbsoluteFill>
      );

    case "split-screen":
      // Side-by-side content comparison
      return (
        <AbsoluteFill>
          {renderBackground(sceneBackground, bgColor)}
          <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", zIndex: 1 }}>
            {/* Left side */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 48,
                borderRight: `2px solid ${accent}`,
              }}
            >
              <EnhancedText
                text={scene.leftContent || "Before"}
                animation="slideRight"
                timing={{ type: "spring", damping: 200 }}
                style={{ color: txtColor, fontSize: 42, fontWeight: 700, textAlign: "center" }}
              />
            </div>
            {/* Right side */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 48,
              }}
            >
              <EnhancedText
                text={scene.rightContent || "After"}
                animation="slideLeft"
                timing={{ type: "spring", damping: 200 }}
                delay={15}
                accentColor={accent}
                style={{ color: accent, fontSize: 42, fontWeight: 700, textAlign: "center" }}
              />
            </div>
          </div>
          {scene.title && (
            <div style={{ position: "absolute", top: 48, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
              <EnhancedText
                text={scene.title}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 15 }}
                style={{ color: txtColor, fontSize: 36, fontWeight: 600 }}
              />
            </div>
          )}
        </AbsoluteFill>
      );

    default:
      return (
        <AbsoluteFill style={{ backgroundColor: bgColor, ...containerStyles }}>
          <EnhancedText
            text={scene.text || ""}
            animation="fadeIn"
            timing={{ type: "linear", durationFrames: 20 }}
            style={{ color: txtColor, fontSize: 36 }}
          />
        </AbsoluteFill>
      );
  }
};

// Helper for bullet icons
function getBulletIcon(index: number): string {
  const icons = ["→", "◆", "★", "●", "▶"];
  return icons[index % icons.length];
}
