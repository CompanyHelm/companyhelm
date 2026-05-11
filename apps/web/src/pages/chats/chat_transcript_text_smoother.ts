import { useEffect, useMemo, useRef, useState } from "react";

type ChatTranscriptTextSmootherFrameHandle = number;

type ChatTranscriptTextSmootherClock = {
  cancelAnimationFrame(handle: ChatTranscriptTextSmootherFrameHandle): void;
  now(): number;
  requestAnimationFrame(callback: () => void): ChatTranscriptTextSmootherFrameHandle;
};

type ChatTranscriptTextSmootherUpdate = {
  isStreaming: boolean;
  smooth: boolean;
  streamKey: string;
  text: string;
};

const defaultClock: ChatTranscriptTextSmootherClock = {
  cancelAnimationFrame(handle) {
    if (typeof window === "undefined") {
      clearTimeout(handle);
      return;
    }

    window.cancelAnimationFrame(handle);
  },
  now() {
    if (typeof performance !== "undefined") {
      return performance.now();
    }

    return Date.now();
  },
  requestAnimationFrame(callback) {
    if (typeof window === "undefined") {
      return setTimeout(callback, 16) as unknown as number;
    }

    return window.requestAnimationFrame(() => {
      callback();
    });
  },
};

/**
 * Mirrors assistant-ui's stream animator closely so CompanyHelm can keep markdown rendering while
 * still decoupling visible typing cadence from backend publish cadence.
 */
export class ChatTranscriptTextSmoother {
  private static readonly targetCatchUpDurationMilliseconds = 250;
  private static readonly maximumTimePerCharacterMilliseconds = 5;

  private displayedText = "";
  private frameHandle: ChatTranscriptTextSmootherFrameHandle | null = null;
  private lastTickAtMilliseconds = 0;
  private streamKey: string | null = null;
  private targetText = "";

  constructor(
    private readonly setDisplayedText: (text: string) => void,
    private readonly clock: ChatTranscriptTextSmootherClock = defaultClock,
  ) {}

  get currentText(): string {
    return this.displayedText;
  }

  dispose(): void {
    this.stop();
  }

  update(input: ChatTranscriptTextSmootherUpdate): string {
    if (!input.smooth) {
      this.reset(input.streamKey, input.text, input.text);
      return this.displayedText;
    }

    const isNewStream = this.streamKey !== input.streamKey;
    const isNonAppendRewrite = !isNewStream && !input.text.startsWith(this.targetText);
    if (isNewStream || isNonAppendRewrite) {
      if (input.isStreaming) {
        this.reset(input.streamKey, "", input.text);
        this.start();
        return this.displayedText;
      }

      this.reset(input.streamKey, input.text, input.text);
      return this.displayedText;
    }

    this.streamKey = input.streamKey;
    this.targetText = input.text;

    if (!input.isStreaming || this.displayedText === this.targetText) {
      this.emit(this.targetText);
      this.stop();
      return this.displayedText;
    }

    this.start();
    return this.displayedText;
  }

  private emit(text: string): void {
    if (this.displayedText === text) {
      return;
    }

    this.displayedText = text;
    this.setDisplayedText(text);
  }

  private reset(streamKey: string, displayedText: string, targetText: string): void {
    this.stop();
    this.streamKey = streamKey;
    this.targetText = targetText;
    this.emit(displayedText);
  }

  private start(): void {
    if (this.frameHandle !== null) {
      return;
    }

    this.lastTickAtMilliseconds = this.clock.now();
    this.frameHandle = this.clock.requestAnimationFrame(() => {
      this.frameHandle = null;
      this.tick();
    });
  }

  private stop(): void {
    if (this.frameHandle === null) {
      return;
    }

    this.clock.cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }

  private tick(): void {
    const remainingCharacters = this.targetText.length - this.displayedText.length;
    if (remainingCharacters <= 0) {
      this.stop();
      return;
    }

    const currentTimeMilliseconds = this.clock.now();
    let timeToConsumeMilliseconds = Math.max(0, currentTimeMilliseconds - this.lastTickAtMilliseconds);
    const timePerCharacterMilliseconds = Math.min(
      ChatTranscriptTextSmoother.maximumTimePerCharacterMilliseconds,
      ChatTranscriptTextSmoother.targetCatchUpDurationMilliseconds / remainingCharacters,
    );

    let charactersToAdd = 0;
    while (
      timeToConsumeMilliseconds >= timePerCharacterMilliseconds
      && charactersToAdd < remainingCharacters
    ) {
      charactersToAdd += 1;
      timeToConsumeMilliseconds -= timePerCharacterMilliseconds;
    }

    if (charactersToAdd !== remainingCharacters) {
      this.start();
    }

    if (charactersToAdd <= 0) {
      return;
    }

    this.emit(this.targetText.slice(0, this.displayedText.length + charactersToAdd));
    this.lastTickAtMilliseconds = currentTimeMilliseconds - timeToConsumeMilliseconds;
  }
}

/**
 * Binds the smoother to one transcript content block so only the actively streaming assistant row
 * animates locally. Historical transcript rows still render persisted text directly.
 */
export function useChatTranscriptSmoothText(input: ChatTranscriptTextSmootherUpdate): string {
  const [displayedText, setDisplayedText] = useState(input.isStreaming ? "" : input.text);
  const smootherRef = useRef<ChatTranscriptTextSmoother | null>(null);

  if (!smootherRef.current) {
    smootherRef.current = new ChatTranscriptTextSmoother(setDisplayedText);
  }

  useEffect(() => {
    return () => {
      smootherRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    smootherRef.current?.update(input);
  }, [input.isStreaming, input.smooth, input.streamKey, input.text]);

  return useMemo(() => displayedText, [displayedText]);
}
