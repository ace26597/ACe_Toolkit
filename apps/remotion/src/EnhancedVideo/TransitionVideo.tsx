import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
} from "remotion";
import {
  TransitionSeries,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";

import { EnhancedScene } from "./EnhancedScene";
import { CaptionDisplay } from "./CaptionDisplay";
import type { EnhancedVideoProps, TransitionConfig, CaptionStyle } from "./types";

// Default caption style
const defaultCaptionStyle: CaptionStyle = {
  position: "bottom",
  fontSize: 48,
  textColor: "#ffffff",
  highlightColor: "#facc15",
  backgroundColor: "rgba(0,0,0,0.6)",
  backgroundOpacity: 0.6,
  animation: "bounce",
  maxWidth: 900,
};

export const TransitionVideo: React.FC<EnhancedVideoProps> = ({
  scenes,
  backgroundColor,
  textColor,
  accentColor,
  backgroundVideo,
  backgroundImage,
  backgroundOpacity = 0.3,
  musicUrl,
  musicVolume = 0.2,
  voiceoverUrl,
  captionPages,
  captionStyle,
}) => {
  // Get transition presentation based on config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTransitionPresentation = (config: TransitionConfig): any => {
    switch (config.type) {
      case "fade":
        return fade();
      case "slide":
        return slide({ direction: config.direction || "from-bottom" });
      case "wipe":
        return wipe({ direction: "from-left" });
      case "flip":
        return flip({ direction: config.direction || "from-bottom" });
      case "clockWipe":
        // clockWipe requires width/height, fallback to fade
        return fade();
      case "none":
      default:
        return fade(); // fallback
    }
  };

  // Get timing based on config
  const getTransitionTiming = (config: TransitionConfig) => {
    // Use spring timing for smoother feel
    return springTiming({
      config: { damping: 200 },
      durationInFrames: config.duration,
    });
  };

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Background Media Layer */}
      {backgroundVideo && (
        <AbsoluteFill style={{ opacity: backgroundOpacity }}>
          <OffthreadVideo
            src={backgroundVideo}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </AbsoluteFill>
      )}

      {backgroundImage && !backgroundVideo && (
        <AbsoluteFill style={{ opacity: backgroundOpacity }}>
          <Img
            src={backgroundImage}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        </AbsoluteFill>
      )}

      {/* Content Layer with Transitions */}
      <TransitionSeries>
        {scenes.map((scene, index) => {
          const elements: React.ReactNode[] = [];

          // Add scene
          elements.push(
            <TransitionSeries.Sequence
              key={`scene-${scene.id}`}
              durationInFrames={scene.duration}
            >
              <EnhancedScene
                scene={scene}
                backgroundColor="transparent"
                textColor={textColor}
                accentColor={accentColor}
              />
            </TransitionSeries.Sequence>
          );

          // Add transition after scene (if not last and has transitionOut)
          if (index < scenes.length - 1) {
            const transitionConfig = scene.transitionOut || {
              type: "fade" as const,
              duration: 15,
            };

            elements.push(
              <TransitionSeries.Transition
                key={`trans-${scene.id}`}
                presentation={getTransitionPresentation(transitionConfig)}
                timing={getTransitionTiming(transitionConfig)}
              />
            );
          }

          return elements;
        })}
      </TransitionSeries>

      {/* Caption Layer */}
      {captionPages && captionPages.length > 0 && (
        <CaptionDisplay
          captions={[]}
          pages={captionPages}
          style={captionStyle || defaultCaptionStyle}
        />
      )}

      {/* Audio Tracks */}
      {voiceoverUrl && <Audio src={voiceoverUrl} volume={1} />}
      {musicUrl && <Audio src={musicUrl} volume={musicVolume} />}
    </AbsoluteFill>
  );
};
