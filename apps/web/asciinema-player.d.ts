declare module 'asciinema-player' {
  interface PlayerOptions {
    cols?: number;
    rows?: number;
    autoPlay?: boolean;
    preload?: boolean;
    loop?: boolean | number;
    startAt?: number | string;
    speed?: number;
    idleTimeLimit?: number;
    theme?: string;
    poster?: string;
    fit?: 'width' | 'height' | 'both' | false;
    controls?: boolean | 'auto';
    markers?: Array<[number, string]>;
    pauseOnMarkers?: boolean;
    terminalFontSize?: string;
    terminalFontFamily?: string;
    terminalLineHeight?: number;
    logger?: unknown;
  }

  interface Player {
    el: HTMLElement;
    dispose: () => void;
    getCurrentTime: () => Promise<number>;
    getDuration: () => Promise<number>;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seek: (pos: number | string) => Promise<void>;
    addEventListener: (name: string, callback: (...args: unknown[]) => void) => void;
  }

  export function create(
    src: string | { driver: string; url?: string; data?: unknown },
    elem: HTMLElement,
    opts?: PlayerOptions,
  ): Player;
}

declare module 'asciinema-player/dist/bundle/asciinema-player.css';
