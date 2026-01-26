import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface AnimatedTextProps {
  text: string;
  delay?: number;
  duration?: number;
  animation?: "fadeIn" | "slideUp" | "typewriter" | "scale";
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  duration = 30,
  animation = "fadeIn",
  style: externalStyle = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayFrames = delay * fps;
  const durationFrames = duration;

  const progress = interpolate(
    frame - delayFrames,
    [0, durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  let animationStyle: React.CSSProperties = {};

  switch (animation) {
    case "fadeIn":
      animationStyle = { opacity: progress };
      break;
    case "slideUp":
      animationStyle = {
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
      };
      break;
    case "scale":
      animationStyle = {
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
      };
      break;
    case "typewriter":
      const visibleChars = Math.floor(progress * text.length);
      return (
        <span style={{ display: "block", ...externalStyle }}>
          {text.slice(0, visibleChars)}
          <span style={{ opacity: 0 }}>{text.slice(visibleChars)}</span>
        </span>
      );
  }

  return (
    <span style={{ display: "block", ...animationStyle, ...externalStyle }}>
      {text}
    </span>
  );
};
