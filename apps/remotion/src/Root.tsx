import "./index.css";
import { Composition } from "remotion";
import { ShortVideo, defaultShortVideoProps } from "./ShortVideo";
import {
  TransitionVideo,
  defaultEnhancedVideoProps,
  calculateTotalDuration,
  EnhancedVideoPropsSchema,
} from "./EnhancedVideo";

// Video formats for different platforms
const VERTICAL = { width: 1080, height: 1920 };
const SQUARE = { width: 1080, height: 1080 };
const HORIZONTAL = { width: 1920, height: 1080 };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vertical Short Video (TikTok, Reels, Shorts) - 60 seconds */}
      <Composition
        id="ShortVideo"
        component={ShortVideo}
        durationInFrames={1800}
        fps={30}
        width={VERTICAL.width}
        height={VERTICAL.height}
        defaultProps={defaultShortVideoProps}
      />

      {/* Vertical Short Video - 30 seconds */}
      <Composition
        id="ShortVideo30"
        component={ShortVideo}
        durationInFrames={900}
        fps={30}
        width={VERTICAL.width}
        height={VERTICAL.height}
        defaultProps={defaultShortVideoProps}
      />

      {/* Vertical Short Video - 15 seconds */}
      <Composition
        id="ShortVideo15"
        component={ShortVideo}
        durationInFrames={450}
        fps={30}
        width={VERTICAL.width}
        height={VERTICAL.height}
        defaultProps={defaultShortVideoProps}
      />

      {/* Square Video (Instagram Feed) */}
      <Composition
        id="SquareVideo"
        component={ShortVideo}
        durationInFrames={1800}
        fps={30}
        width={SQUARE.width}
        height={SQUARE.height}
        defaultProps={defaultShortVideoProps}
      />

      {/* Horizontal Video (YouTube) */}
      <Composition
        id="HorizontalVideo"
        component={ShortVideo}
        durationInFrames={1800}
        fps={30}
        width={HORIZONTAL.width}
        height={HORIZONTAL.height}
        defaultProps={defaultShortVideoProps}
      />

      {/* ========== ENHANCED VIDEO (with transitions + captions) ========== */}

      {/* Enhanced Vertical Video - 60 seconds */}
      <Composition
        id="EnhancedVideo"
        component={TransitionVideo}
        durationInFrames={calculateTotalDuration(defaultEnhancedVideoProps.scenes)}
        fps={30}
        width={VERTICAL.width}
        height={VERTICAL.height}
        schema={EnhancedVideoPropsSchema}
        defaultProps={defaultEnhancedVideoProps}
      />

      {/* Enhanced Vertical Video - 30 seconds */}
      <Composition
        id="EnhancedVideo30"
        component={TransitionVideo}
        durationInFrames={900}
        fps={30}
        width={VERTICAL.width}
        height={VERTICAL.height}
        schema={EnhancedVideoPropsSchema}
        defaultProps={defaultEnhancedVideoProps}
      />

      {/* Enhanced Vertical Video - 15 seconds */}
      <Composition
        id="EnhancedVideo15"
        component={TransitionVideo}
        durationInFrames={450}
        fps={30}
        width={VERTICAL.width}
        height={VERTICAL.height}
        schema={EnhancedVideoPropsSchema}
        defaultProps={defaultEnhancedVideoProps}
      />

      {/* Enhanced Square Video */}
      <Composition
        id="EnhancedSquare"
        component={TransitionVideo}
        durationInFrames={1800}
        fps={30}
        width={SQUARE.width}
        height={SQUARE.height}
        schema={EnhancedVideoPropsSchema}
        defaultProps={defaultEnhancedVideoProps}
      />

      {/* Enhanced Horizontal Video */}
      <Composition
        id="EnhancedHorizontal"
        component={TransitionVideo}
        durationInFrames={1800}
        fps={30}
        width={HORIZONTAL.width}
        height={HORIZONTAL.height}
        schema={EnhancedVideoPropsSchema}
        defaultProps={defaultEnhancedVideoProps}
      />
    </>
  );
};
