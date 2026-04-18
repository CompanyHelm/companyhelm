type SmoothStreamingTextState = {
  displayText: string;
  shouldContinue: boolean;
};

/**
 * Owns the client-side reveal policy for one streaming assistant text block. The controller keeps a
 * lightweight display cursor that can trail the latest server text by a small amount so bursty
 * subscription updates still appear continuous instead of jumping in visible chunks.
 */
export class SmoothStreamingTextController {
  private readonly minimumInitialRevealSegmentCount = 12;
  private readonly initialRevealSegmentCount = 6;
  private readonly segmenter: Intl.Segmenter | null;
  private displayText = "";
  private displayedSegmentCount = 0;
  private lastFrameTimestamp: number | null = null;
  private revealRemainder = 0;
  private targetSegments: string[] = [];
  private targetText = "";

  constructor() {
    this.segmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  }

  /**
   * Drops every cached segment and timing value. Message rows call this when React unmounts the
   * streaming bubble so the next message starts fresh instead of inheriting the previous reveal
   * cursor.
   */
  reset(): void {
    this.displayText = "";
    this.displayedSegmentCount = 0;
    this.lastFrameTimestamp = null;
    this.revealRemainder = 0;
    this.targetSegments = [];
    this.targetText = "";
  }

  /**
   * Updates the latest server-authored text. Append-only updates continue animating toward the new
   * target, while non-append rewrites snap immediately so edits to earlier content never animate in
   * the wrong direction. Completed messages also snap immediately because the markdown renderer can
   * take over once the final payload arrives.
   */
  setTargetText(targetText: string, options: { isComplete: boolean }): SmoothStreamingTextState {
    const targetWasRewritten = this.targetText.length > 0 && !targetText.startsWith(this.targetText);
    this.targetText = targetText;
    this.targetSegments = this.segmentText(targetText);

    if (options.isComplete || targetWasRewritten) {
      return this.snapToTarget();
    }

    if (this.displayedSegmentCount > this.targetSegments.length) {
      return this.snapToTarget();
    }

    if (this.displayedSegmentCount === 0 && this.targetSegments.length > 0) {
      if (!this.canBeginReveal()) {
        return {
          displayText: this.displayText,
          shouldContinue: false,
        };
      }

      this.displayedSegmentCount = Math.min(this.targetSegments.length, this.initialRevealSegmentCount);
      this.displayText = this.targetSegments.slice(0, this.displayedSegmentCount).join("");
    }

    return {
      displayText: this.displayText,
      shouldContinue: this.displayedSegmentCount < this.targetSegments.length,
    };
  }

  /**
   * Small early chunks often arrive while the model is still reasoning, which can leave the UI
   * showing only a lone markdown marker or first character for several seconds. Hold those tiny
   * prefixes back until the buffer is large enough to look like real streaming.
   */
  private canBeginReveal(): boolean {
    return this.targetSegments.length >= this.minimumInitialRevealSegmentCount;
  }

  /**
   * Advances the reveal cursor for one animation frame. The controller intentionally accelerates as
   * backlog grows so a burst of incoming tokens catches up quickly, but it still limits small
   * backlogs to only a few graphemes per frame to preserve a smooth "typing" illusion.
   */
  advanceTo(timestamp: number): SmoothStreamingTextState {
    const backlog = this.targetSegments.length - this.displayedSegmentCount;
    if (backlog <= 0) {
      this.lastFrameTimestamp = timestamp;
      return {
        displayText: this.displayText,
        shouldContinue: false,
      };
    }

    if (backlog >= 480) {
      return this.snapToTarget(timestamp);
    }

    const previousTimestamp = this.lastFrameTimestamp ?? (timestamp - 16);
    const frameDuration = Math.max(0, Math.min(64, timestamp - previousTimestamp));
    this.lastFrameTimestamp = timestamp;

    const revealBudget = this.resolveSegmentsPerSecond(backlog) * (frameDuration / 1000) + this.revealRemainder;
    const segmentsToReveal = Math.max(1, Math.floor(revealBudget));
    this.revealRemainder = revealBudget - segmentsToReveal;

    const nextDisplayedSegmentCount = Math.min(
      this.targetSegments.length,
      this.displayedSegmentCount + segmentsToReveal,
    );
    if (nextDisplayedSegmentCount > this.displayedSegmentCount) {
      this.displayText += this.targetSegments
        .slice(this.displayedSegmentCount, nextDisplayedSegmentCount)
        .join("");
      this.displayedSegmentCount = nextDisplayedSegmentCount;
    }

    return {
      displayText: this.displayText,
      shouldContinue: this.displayedSegmentCount < this.targetSegments.length,
    };
  }

  private snapToTarget(timestamp: number | null = null): SmoothStreamingTextState {
    this.displayText = this.targetText;
    this.displayedSegmentCount = this.targetSegments.length;
    this.lastFrameTimestamp = timestamp;
    this.revealRemainder = 0;

    return {
      displayText: this.displayText,
      shouldContinue: false,
    };
  }

  private segmentText(text: string): string[] {
    if (text.length === 0) {
      return [];
    }
    if (!this.segmenter) {
      return Array.from(text);
    }

    return [...this.segmenter.segment(text)].map((entry) => entry.segment);
  }

  private resolveSegmentsPerSecond(backlog: number): number {
    if (backlog >= 240) {
      return 1400;
    }
    if (backlog >= 120) {
      return 1050;
    }
    if (backlog >= 48) {
      return 720;
    }
    if (backlog >= 16) {
      return 360;
    }

    return 150;
  }
}
