export interface Section {
  type: "hook" | "content" | "cta";
  startFrame: number;
  durationFrames: number;
  text: string;
  title?: string;
  bulletPoints?: string[];
  subtext?: string;
}

export interface ShortVideoProps {
  // Script content (all optional with defaults)
  title?: string;
  hook?: string;
  sections?: Section[];
  cta?: string;
  ctaSubtext?: string;

  // Styling
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;

  // Media (optional)
  backgroundVideo?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  voiceoverUrl?: string;
  musicUrl?: string;
  musicVolume?: number;
}

// Default props for 60-second video at 30fps = 1800 frames
export const defaultShortVideoProps: ShortVideoProps = {
  title: "Untitled Video",
  hook: "Stop scrolling!",
  sections: [
    {
      type: "hook",
      startFrame: 0,
      durationFrames: 90, // 0-3s
      text: "Stop scrolling!",
    },
    {
      type: "content",
      startFrame: 90,
      durationFrames: 360, // 3-15s
      text: "Here's what you need to know...",
      title: "The Setup",
    },
    {
      type: "content",
      startFrame: 450,
      durationFrames: 900, // 15-45s
      text: "The main content goes here.",
      title: "Key Points",
      bulletPoints: ["Point 1", "Point 2", "Point 3"],
    },
    {
      type: "content",
      startFrame: 1350,
      durationFrames: 300, // 45-55s
      text: "In conclusion...",
      title: "Takeaway",
    },
    {
      type: "cta",
      startFrame: 1650,
      durationFrames: 150, // 55-60s
      text: "Follow for more!",
      subtext: "@yourhandle",
    },
  ],
  cta: "Follow for more!",
  ctaSubtext: "@yourhandle",
  backgroundColor: "#000000",
  textColor: "#ffffff",
  accentColor: "#3b82f6",
  backgroundOpacity: 0.3,
  musicVolume: 0.2,
};
