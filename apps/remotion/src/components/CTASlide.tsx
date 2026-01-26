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
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      <div
        style={{
          padding: 32,
          borderRadius: 16,
          textAlign: "center",
          boxShadow: `0 0 ${40 * glowIntensity}px ${accentColor}40`,
          border: `3px solid ${accentColor}`,
        }}
      >
        <AnimatedText
          text={text}
          animation="scale"
          duration={20}
          style={{ color: textColor, fontSize: 48, fontWeight: 700, marginBottom: 16 }}
        />
        {subtext && (
          <AnimatedText
            text={subtext}
            animation="fadeIn"
            delay={0.5}
            duration={15}
            style={{ color: accentColor, fontSize: 24 }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
