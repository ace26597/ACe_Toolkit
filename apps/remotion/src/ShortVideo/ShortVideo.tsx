import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
} from "remotion";
import { HookSlide, ContentSlide, CTASlide } from "../components";
import { ShortVideoProps, Section } from "./types";

export const ShortVideo: React.FC<ShortVideoProps> = ({
  hook = "Stop scrolling!",
  sections = [],
  cta = "Follow for more!",
  ctaSubtext,
  backgroundColor = "#000000",
  textColor = "#ffffff",
  accentColor = "#3b82f6",
  backgroundVideo,
  backgroundImage,
  backgroundOpacity = 0.3,
  voiceoverUrl,
  musicUrl,
  musicVolume = 0.2,
}) => {
  const renderSection = (section: Section, index: number) => {
    switch (section.type) {
      case "hook":
        return (
          <Sequence
            key={index}
            from={section.startFrame}
            durationInFrames={section.durationFrames}
          >
            <HookSlide
              text={section.text || hook}
              backgroundColor="transparent"
              textColor={textColor}
            />
          </Sequence>
        );

      case "content":
        return (
          <Sequence
            key={index}
            from={section.startFrame}
            durationInFrames={section.durationFrames}
          >
            <ContentSlide
              title={section.title}
              content={section.text}
              bulletPoints={section.bulletPoints}
              backgroundColor="transparent"
              textColor={textColor}
              accentColor={accentColor}
            />
          </Sequence>
        );

      case "cta":
        return (
          <Sequence
            key={index}
            from={section.startFrame}
            durationInFrames={section.durationFrames}
          >
            <CTASlide
              text={section.text || cta}
              subtext={section.subtext || ctaSubtext}
              backgroundColor="transparent"
              textColor={textColor}
              accentColor={accentColor}
            />
          </Sequence>
        );

      default:
        return null;
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Background Media */}
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

      {/* Content Sections */}
      {sections?.map((section, index) => renderSection(section, index))}

      {/* Audio Tracks */}
      {voiceoverUrl && (
        <Audio src={voiceoverUrl} volume={1} />
      )}

      {musicUrl && (
        <Audio src={musicUrl} volume={musicVolume} />
      )}
    </AbsoluteFill>
  );
};
