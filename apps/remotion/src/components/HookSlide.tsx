import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { AnimatedText } from "./AnimatedText";

const { fontFamily } = loadFont();

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
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        fontFamily,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          color: textColor,
          textAlign: "center",
        }}
      >
        <AnimatedText
          text={text}
          animation="scale"
          duration={20}
          style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}
        />
      </div>
    </AbsoluteFill>
  );
};
