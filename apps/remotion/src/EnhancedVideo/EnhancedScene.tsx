import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { EnhancedText } from "./EnhancedText";
import { EnhancedScene as EnhancedSceneType } from "./types";

interface EnhancedSceneProps {
  scene: EnhancedSceneType;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export const EnhancedScene: React.FC<EnhancedSceneProps> = ({
  scene,
  backgroundColor,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Use scene-specific colors or fall back to global
  const bgColor = scene.backgroundColor || backgroundColor;
  const txtColor = scene.textColor || textColor;
  const accent = scene.accentColor || accentColor;

  switch (scene.type) {
    case "hook":
      return (
        <AbsoluteFill
          style={{ backgroundColor: bgColor }}
          className="flex items-center justify-center p-12"
        >
          <div className="text-center max-w-4xl">
            {/* Pulse effect for hooks */}
            <div
              style={{
                transform: `scale(${interpolate(frame % 45, [0, 22, 45], [1, 1.03, 1])})`,
              }}
            >
              <EnhancedText
                text={scene.text || ""}
                emphasis={scene.emphasis}
                animation={scene.animation}
                timing={scene.timing}
                accentColor={accent}
                className="text-6xl font-black leading-tight"
                style={{ color: txtColor }}
              />
            </div>
          </div>
        </AbsoluteFill>
      );

    case "title-card":
      return (
        <AbsoluteFill
          style={{ backgroundColor: bgColor }}
          className="flex items-center justify-center p-12"
        >
          <div className="text-center">
            <EnhancedText
              text={scene.title || scene.text || ""}
              emphasis={scene.emphasis}
              animation={scene.animation}
              timing={scene.timing}
              accentColor={accent}
              className="text-7xl font-black"
              style={{ color: accent }}
            />
            {scene.text && scene.title && (
              <EnhancedText
                text={scene.text}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 20 }}
                delay={20}
                className="text-3xl mt-8"
                style={{ color: txtColor, opacity: 0.8 }}
              />
            )}
          </div>
        </AbsoluteFill>
      );

    case "content":
      return (
        <AbsoluteFill
          style={{ backgroundColor: bgColor }}
          className="flex flex-col justify-center p-16"
        >
          {scene.title && (
            <EnhancedText
              text={scene.title}
              animation="slideUp"
              timing={{ type: "spring", damping: 200 }}
              accentColor={accent}
              className="text-4xl font-bold mb-8"
              style={{ color: accent }}
            />
          )}
          <EnhancedText
            text={scene.text || ""}
            emphasis={scene.emphasis}
            animation={scene.animation}
            timing={scene.timing}
            delay={scene.title ? 10 : 0}
            accentColor={accent}
            className="text-3xl leading-relaxed"
            style={{ color: txtColor }}
          />
        </AbsoluteFill>
      );

    case "bullet-list":
      return (
        <AbsoluteFill
          style={{ backgroundColor: bgColor }}
          className="flex flex-col justify-center p-16"
        >
          {scene.title && (
            <EnhancedText
              text={scene.title}
              animation="slideUp"
              timing={{ type: "spring", damping: 200 }}
              accentColor={accent}
              className="text-4xl font-bold mb-10"
              style={{ color: accent }}
            />
          )}
          <ul className="space-y-6">
            {(scene.bullets || []).map((bullet, index) => {
              const bulletDelay = (scene.staggerDelay || 15) * (index + 1);
              const bulletProgress = spring({
                frame: frame - bulletDelay,
                fps,
                config: { damping: 150 },
              });

              return (
                <li
                  key={index}
                  className="flex items-start gap-6 text-2xl"
                  style={{
                    opacity: bulletProgress,
                    transform: `translateX(${interpolate(bulletProgress, [0, 1], [-40, 0])}px)`,
                  }}
                >
                  <span
                    className="text-3xl mt-1"
                    style={{ color: accent }}
                  >
                    {getBulletIcon(index)}
                  </span>
                  <span style={{ color: txtColor }}>{bullet}</span>
                </li>
              );
            })}
          </ul>
        </AbsoluteFill>
      );

    case "quote":
      return (
        <AbsoluteFill
          style={{ backgroundColor: bgColor }}
          className="flex items-center justify-center p-16"
        >
          <div className="max-w-4xl text-center">
            <span
              className="text-8xl leading-none"
              style={{
                color: accent,
                opacity: 0.3,
                position: "absolute",
                top: "20%",
                left: "10%",
              }}
            >
              "
            </span>
            <EnhancedText
              text={scene.text || ""}
              emphasis={scene.emphasis}
              animation={scene.animation}
              timing={scene.timing}
              accentColor={accent}
              className="text-4xl italic leading-relaxed"
              style={{ color: txtColor }}
            />
            {scene.title && (
              <EnhancedText
                text={`— ${scene.title}`}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 20 }}
                delay={30}
                className="text-2xl mt-8"
                style={{ color: accent }}
              />
            )}
          </div>
        </AbsoluteFill>
      );

    case "cta":
      return (
        <AbsoluteFill
          style={{ backgroundColor: bgColor }}
          className="flex flex-col items-center justify-center p-12"
        >
          <div className="text-center">
            {/* Animated arrow or icon */}
            <div
              style={{
                transform: `translateY(${interpolate(frame % 30, [0, 15, 30], [0, -10, 0])}px)`,
                marginBottom: 24,
              }}
            >
              <span className="text-5xl">👆</span>
            </div>

            <EnhancedText
              text={scene.text || "Follow for more!"}
              emphasis={scene.emphasis}
              animation={scene.animation}
              timing={scene.timing}
              accentColor={accent}
              className="text-5xl font-black"
              style={{ color: txtColor }}
            />

            {scene.title && (
              <EnhancedText
                text={scene.title}
                animation="fadeIn"
                timing={{ type: "linear", durationFrames: 20 }}
                delay={15}
                className="text-2xl mt-6"
                style={{ color: accent, opacity: 0.8 }}
              />
            )}

            {/* Pulsing button effect */}
            <div
              className="mt-8 px-8 py-4 rounded-full inline-block"
              style={{
                backgroundColor: accent,
                transform: `scale(${interpolate(frame % 60, [0, 30, 60], [1, 1.05, 1])})`,
              }}
            >
              <span className="text-xl font-bold" style={{ color: bgColor }}>
                TAP TO FOLLOW
              </span>
            </div>
          </div>
        </AbsoluteFill>
      );

    default:
      return (
        <AbsoluteFill style={{ backgroundColor: bgColor }}>
          <div className="flex items-center justify-center h-full">
            <EnhancedText
              text={scene.text || ""}
              animation="fadeIn"
              timing={{ type: "linear", durationFrames: 20 }}
              className="text-3xl"
              style={{ color: txtColor }}
            />
          </div>
        </AbsoluteFill>
      );
  }
};

// Helper for bullet icons
function getBulletIcon(index: number): string {
  const icons = ["→", "◆", "★", "●", "▶"];
  return icons[index % icons.length];
}
