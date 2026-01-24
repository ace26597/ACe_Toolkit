// Enhanced Video Props Schema
import { z } from "zod";
import type { Caption } from "@remotion/captions";

// ============ Zod Schemas ============

export const TimingConfigSchema = z.object({
  type: z.enum(["linear", "spring", "easing"]),
  damping: z.number().optional(),
  stiffness: z.number().optional(),
  mass: z.number().optional(),
  easing: z.enum(["quad", "sin", "exp", "circle"]).optional(),
  durationFrames: z.number().optional(),
});

export const TransitionConfigSchema = z.object({
  type: z.enum(["fade", "slide", "wipe", "flip", "clockWipe", "none"]),
  direction: z.enum(["from-left", "from-right", "from-top", "from-bottom"]).optional(),
  duration: z.number(),
});

export const EnhancedSceneSchema = z.object({
  id: z.string(),
  type: z.enum(["hook", "content", "bullet-list", "quote", "cta", "title-card"]),
  duration: z.number(),
  text: z.string().optional(),
  title: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  emphasis: z.array(z.string()).optional(),
  animation: z.enum(["fadeIn", "slideUp", "slideDown", "slideLeft", "slideRight", "scale", "typewriter", "bounce", "blur"]),
  timing: TimingConfigSchema,
  staggerDelay: z.number().optional(),
  transitionIn: TransitionConfigSchema.optional(),
  transitionOut: TransitionConfigSchema.optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
});

export const CaptionStyleSchema = z.object({
  position: z.enum(["bottom", "middle", "top"]),
  fontSize: z.number().min(12).max(120),
  fontFamily: z.string().optional(),
  textColor: z.string(),
  highlightColor: z.string(),
  backgroundColor: z.string().optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  animation: z.enum(["none", "bounce", "pop", "slide", "fade"]),
  maxWidth: z.number().optional(),
});

export const CaptionTokenSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

export const CaptionPageSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  tokens: z.array(CaptionTokenSchema),
});

export const EnhancedVideoPropsSchema = z.object({
  scenes: z.array(EnhancedSceneSchema),
  backgroundColor: z.string(),
  textColor: z.string(),
  accentColor: z.string(),
  fontFamily: z.string().optional(),
  backgroundVideo: z.string().optional(),
  backgroundImage: z.string().optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  musicUrl: z.string().optional(),
  musicVolume: z.number().min(0).max(1).optional(),
  voiceoverUrl: z.string().optional(),
  // Captions
  captionPages: z.array(CaptionPageSchema).optional(),
  captionStyle: CaptionStyleSchema.optional(),
  title: z.string().optional(),
});

// ============ TypeScript Types (inferred from Zod) ============

export type TimingConfig = z.infer<typeof TimingConfigSchema>;
export type TransitionConfig = z.infer<typeof TransitionConfigSchema>;
export type EnhancedScene = z.infer<typeof EnhancedSceneSchema>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;
export type CaptionToken = z.infer<typeof CaptionTokenSchema>;
export type CaptionPage = z.infer<typeof CaptionPageSchema>;
export type EnhancedVideoProps = z.infer<typeof EnhancedVideoPropsSchema>;

// Re-export Caption type from @remotion/captions
export type { Caption };

// Default timing presets
export const TIMING_PRESETS = {
  bouncy: { type: "spring" as const, damping: 8 },
  smooth: { type: "spring" as const, damping: 200 },
  snappy: { type: "spring" as const, damping: 20, stiffness: 200 },
  heavy: { type: "spring" as const, damping: 15, stiffness: 80, mass: 2 },
  linear: { type: "linear" as const, durationFrames: 20 },
  easeInOut: { type: "easing" as const, easing: "quad" as const },
};

// Default transition presets
export const TRANSITION_PRESETS = {
  fadeQuick: { type: "fade" as const, duration: 10 },
  fadeSlow: { type: "fade" as const, duration: 20 },
  slideUp: { type: "slide" as const, direction: "from-bottom" as const, duration: 15 },
  slideDown: { type: "slide" as const, direction: "from-top" as const, duration: 15 },
  slideLeft: { type: "slide" as const, direction: "from-right" as const, duration: 15 },
  slideRight: { type: "slide" as const, direction: "from-left" as const, duration: 15 },
  wipe: { type: "wipe" as const, duration: 20 },
};

// Calculate total duration accounting for transition overlaps
export function calculateTotalDuration(scenes: EnhancedScene[]): number {
  let total = 0;
  for (let i = 0; i < scenes.length; i++) {
    total += scenes[i].duration;
    // Subtract transition overlap (transitions play during both scenes)
    if (i < scenes.length - 1 && scenes[i].transitionOut) {
      total -= scenes[i].transitionOut!.duration;
    }
  }
  return total;
}

// Default props for testing
export const defaultEnhancedVideoProps: EnhancedVideoProps = {
  scenes: [
    {
      id: "hook",
      type: "hook",
      duration: 90,
      text: "Stop scrolling! This will change everything.",
      emphasis: ["change everything"],
      animation: "scale",
      timing: TIMING_PRESETS.bouncy,
      transitionOut: TRANSITION_PRESETS.slideUp,
    },
    {
      id: "content1",
      type: "content",
      duration: 180,
      title: "The Big Reveal",
      text: "Here's what you need to know about this game-changing feature.",
      animation: "slideUp",
      timing: TIMING_PRESETS.smooth,
      transitionIn: TRANSITION_PRESETS.fadeQuick,
      transitionOut: TRANSITION_PRESETS.fadeQuick,
    },
    {
      id: "bullets",
      type: "bullet-list",
      duration: 240,
      title: "Key Benefits",
      bullets: ["Saves you time", "Increases productivity", "Easy to use"],
      animation: "slideUp",
      timing: TIMING_PRESETS.smooth,
      staggerDelay: 20,
      transitionIn: TRANSITION_PRESETS.slideLeft,
      transitionOut: TRANSITION_PRESETS.fadeQuick,
    },
    {
      id: "cta",
      type: "cta",
      duration: 120,
      text: "Follow for more tips!",
      animation: "bounce",
      timing: TIMING_PRESETS.snappy,
      transitionIn: TRANSITION_PRESETS.slideUp,
    },
  ],
  backgroundColor: "#0a0a0a",
  textColor: "#ffffff",
  accentColor: "#8b5cf6",
};
