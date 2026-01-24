import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AnimatedText } from "./AnimatedText";

interface HookSlideProps {
  text: string;
  backgroundColor?: string;
  textColor?: string;
}

export const HookSlide: React.FC<HookSlideProps> = ({
  text,
  backgroundColor = "#000",
  textColor = "#fff",
}) => {
  const frame = useCurrentFrame();

  // Pulse effect for attention
  const scale = interpolate(
    frame % 30,
    [0, 15, 30],
    [1, 1.02, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor }}
      className="flex items-center justify-center p-12"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          color: textColor,
        }}
        className="text-center"
      >
        <AnimatedText
          text={text}
          animation="scale"
          duration={20}
          className="text-6xl font-bold leading-tight"
        />
      </div>
    </AbsoluteFill>
  );
};
