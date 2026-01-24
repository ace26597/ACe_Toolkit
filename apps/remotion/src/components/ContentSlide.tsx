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
      style={{ backgroundColor }}
      className="flex flex-col justify-center p-16"
    >
      {title && (
        <AnimatedText
          text={title}
          animation="slideUp"
          duration={15}
          className="text-4xl font-bold mb-8"
          style={{ color: accentColor }}
        />
      )}

      <AnimatedText
        text={content}
        animation="fadeIn"
        delay={0.3}
        duration={20}
        className="text-3xl leading-relaxed mb-8"
        style={{ color: textColor }}
      />

      {bulletPoints && bulletPoints.length > 0 && (
        <ul className="space-y-4">
          {bulletPoints.map((point, index) => (
            <li
              key={index}
              className="flex items-start gap-4 text-2xl"
              style={{
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
