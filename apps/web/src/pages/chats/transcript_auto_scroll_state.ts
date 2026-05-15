/**
 * Tracks whether the transcript should keep following the live tail.
 *
 * Sticky mode is intentionally conservative: once the operator is attached to the
 * bottom, incoming transcript growth must not knock them out of that mode. The
 * operator leaves sticky mode only through explicit upward intent, either from a
 * real upward scroll position change or from an upward wheel gesture that lands
 * while streaming is still extending the transcript.
 */
export class TranscriptAutoScrollState {
  private isProgrammaticScrollActive = false;
  private previousClientHeight = 0;
  private previousScrollTop = 0;
  private shouldStickToBottom = true;

  public beginProgrammaticScroll(): void {
    this.isProgrammaticScrollActive = true;
  }

  public completeProgrammaticScroll(currentScrollTop: number): void {
    this.isProgrammaticScrollActive = false;
    this.previousScrollTop = currentScrollTop;
  }

  public getShouldStickToBottom(): boolean {
    return this.shouldStickToBottom;
  }

  public noteUpwardScrollIntent(input: {
    clientHeight: number;
    scrollHeight: number;
    scrollTop: number;
  }): boolean {
    if (this.isProgrammaticScrollActive) {
      return this.shouldStickToBottom;
    }

    const maxScrollTop = Math.max(0, input.scrollHeight - input.clientHeight);
    const canScrollUp = maxScrollTop > 0 || input.scrollTop > 0;
    if (!canScrollUp) {
      return this.shouldStickToBottom;
    }

    this.shouldStickToBottom = false;
    return this.shouldStickToBottom;
  }

  public reset(): void {
    this.isProgrammaticScrollActive = false;
    this.previousClientHeight = 0;
    this.previousScrollTop = 0;
    this.shouldStickToBottom = true;
  }

  /**
   * Viewport height changes come from layout shifts such as the chat composer growing to multiple
   * lines. If the operator is still attached to the live tail, those shifts should preserve the
   * bottom anchor instead of silently leaving the transcript above the newest message.
   */
  public shouldMaintainBottomOnViewportResize(clientHeight: number): boolean {
    const hasPreviousViewportHeight = this.previousClientHeight > 0;
    const hasViewportHeightChanged = hasPreviousViewportHeight && this.previousClientHeight !== clientHeight;
    this.previousClientHeight = clientHeight;
    return this.shouldStickToBottom && hasViewportHeightChanged;
  }

  public setShouldStickToBottom(shouldStickToBottom: boolean): void {
    this.shouldStickToBottom = shouldStickToBottom;
  }

  public syncFromScroll(input: {
    bottomThresholdPx: number;
    clientHeight: number;
    scrollHeight: number;
    scrollTop: number;
  }): boolean {
    const distanceFromBottom = input.scrollHeight - input.scrollTop - input.clientHeight;
    const isNearBottom = distanceFromBottom <= input.bottomThresholdPx;
    const hasPreviousViewportHeight = this.previousClientHeight > 0;
    const hasViewportHeightChanged = hasPreviousViewportHeight && this.previousClientHeight !== input.clientHeight;
    const isScrollingDown = input.scrollTop > this.previousScrollTop;
    const isScrollingUp = input.scrollTop < this.previousScrollTop;
    this.previousClientHeight = input.clientHeight;

    if (!this.isProgrammaticScrollActive) {
      if (hasViewportHeightChanged) {
        // Composer growth/collapse changes the transcript viewport height and the browser may adjust
        // scrollTop to preserve the visible anchor. That movement is layout-driven rather than an
        // explicit operator scroll, so sticky mode should stay exactly where it already is.
      } else if (isScrollingUp) {
        this.shouldStickToBottom = false;
      } else if (!this.shouldStickToBottom && isNearBottom && isScrollingDown) {
        this.shouldStickToBottom = true;
      }
    }

    this.previousScrollTop = input.scrollTop;
    return this.shouldStickToBottom;
  }
}
