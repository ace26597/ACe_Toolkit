import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  animation?: "fadeIn" | "slideUp" | "typewriter" | "scale";
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  className = "",
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

  let style: React.CSSProperties = {};

  switch (animation) {
    case "fadeIn":
      style = { opacity: progress };
      break;
    case "slideUp":
      style = {
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
      };
      break;
    case "scale":
      style = {
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
      };
      break;
    case "typewriter":
      const visibleChars = Math.floor(progress * text.length);
      return (
        <span className={className} style={externalStyle}>
          {text.slice(0, visibleChars)}
          <span className="opacity-0">{text.slice(visibleChars)}</span>
        </span>
      );
  }

  return (
    <span className={className} style={{ ...style, ...externalStyle }}>
      {text}
    </span>
  );
};
