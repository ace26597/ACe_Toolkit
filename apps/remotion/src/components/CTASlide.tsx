import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AnimatedText } from "./AnimatedText";

interface CTASlideProps {
  text: string;
  subtext?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const CTASlide: React.FC<CTASlideProps> = ({
  text,
  subtext,
  backgroundColor = "#000",
  textColor = "#fff",
  accentColor = "#22c55e",
}) => {
  const frame = useCurrentFrame();

  // Animated border/glow effect
  const glowIntensity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.5, 1, 0.5]
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor }}
      className="flex flex-col items-center justify-center p-12"
    >
      <div
        className="p-8 rounded-2xl text-center"
        style={{
          boxShadow: `0 0 ${40 * glowIntensity}px ${accentColor}40`,
          border: `3px solid ${accentColor}`,
        }}
      >
        <AnimatedText
          text={text}
          animation="scale"
          duration={20}
          className="text-5xl font-bold mb-4"
          style={{ color: textColor }}
        />
        {subtext && (
          <AnimatedText
            text={subtext}
            animation="fadeIn"
            delay={0.5}
            duration={15}
            className="text-2xl"
            style={{ color: accentColor }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
