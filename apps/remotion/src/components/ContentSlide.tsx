import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AnimatedText } from "./AnimatedText";

interface ContentSlideProps {
  title?: string;
  content: string;
  bulletPoints?: string[];
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const ContentSlide: React.FC<ContentSlideProps> = ({
  title,
  content,
  bulletPoints,
  backgroundColor = "#111",
  textColor = "#fff",
  accentColor = "#3b82f6",
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 64,
      }}
    >
      {title && (
        <AnimatedText
          text={title}
          animation="slideUp"
          duration={15}
          style={{ color: accentColor, fontSize: 48, fontWeight: 700, marginBottom: 32 }}
        />
      )}

      <AnimatedText
        text={content}
        animation="fadeIn"
        delay={0.3}
        duration={20}
        style={{ color: textColor, fontSize: 36, lineHeight: 1.6, marginBottom: 32 }}
      />

      {bulletPoints && bulletPoints.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {bulletPoints.map((point, index) => (
            <li
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                fontSize: 28,
                opacity: interpolate(
                  frame,
                  [20 + index * 15, 35 + index * 15],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
                transform: `translateX(${interpolate(
                  frame,
                  [20 + index * 15, 35 + index * 15],
                  [-30, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )}px)`,
                color: textColor,
              }}
            >
              <span style={{ color: accentColor }}>•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </AbsoluteFill>
  );
};
