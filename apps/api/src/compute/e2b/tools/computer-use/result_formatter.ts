/**
 * Formats human-readable summaries for E2B desktop SDK tool calls so transcript entries stay
 * concise while still surfacing the key coordinates, window ids, or screenshot payload sizes.
 */
export class AgentComputeE2bComputerUseResultFormatter {
  static formatAction(message: string): string {
    return message;
  }

  static formatCursorPosition(position: { x: number; y: number }): string {
    return `Cursor position: x=${position.x}, y=${position.y}.`;
  }

  static formatScreenSize(size: { height: number; width: number }): string {
    return `Screen size: ${size.width}x${size.height}.`;
  }

  static formatWindowIds(application: string, windowIds: string[]): string {
    if (windowIds.length === 0) {
      return `No windows found for application "${application}".`;
    }

    return `Found ${windowIds.length} window(s) for "${application}": ${windowIds.join(", ")}.`;
  }

  static formatScreenshot(byteLength: number): string {
    return `Captured a PNG screenshot (${byteLength} bytes, returned as base64 in details.base64EncodedPng).`;
  }

  static formatWaitAndVerify(success: boolean, command: string): string {
    return success
      ? `Condition matched while waiting for "${command}".`
      : `Condition did not match before the wait timeout for "${command}".`;
  }

  static formatWindowTitle(windowId: string, title: string): string {
    return `Window ${windowId} title: ${title}.`;
  }
}
