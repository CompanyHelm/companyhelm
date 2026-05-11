import assert from "node:assert/strict";
import test from "node:test";
import { ChatTranscriptTextSmoother } from "../src/pages/chats/chat_transcript_text_smoother";

type ScheduledTask = {
  callback: () => void;
  dueAtMilliseconds: number;
  id: number;
};

class ChatTranscriptTextSmootherTestClock {
  private nextTaskId = 1;
  private nowMilliseconds = 0;
  private scheduledTasks: ScheduledTask[] = [];

  now(): number {
    return this.nowMilliseconds;
  }

  requestAnimationFrame(callback: () => void): number {
    const taskId = this.nextTaskId;
    this.nextTaskId += 1;
    this.scheduledTasks.push({
      callback,
      dueAtMilliseconds: this.nowMilliseconds + 16,
      id: taskId,
    });
    return taskId;
  }

  cancelAnimationFrame(handle: number): void {
    this.scheduledTasks = this.scheduledTasks.filter((scheduledTask) => {
      return scheduledTask.id !== handle;
    });
  }

  advanceBy(delayMilliseconds: number): void {
    const targetTimeMilliseconds = this.nowMilliseconds + delayMilliseconds;
    while (true) {
      const nextScheduledTask = this.scheduledTasks
        .slice()
        .sort((firstTask, secondTask) => firstTask.dueAtMilliseconds - secondTask.dueAtMilliseconds)[0];
      if (!nextScheduledTask || nextScheduledTask.dueAtMilliseconds > targetTimeMilliseconds) {
        break;
      }

      this.nowMilliseconds = nextScheduledTask.dueAtMilliseconds;
      this.scheduledTasks = this.scheduledTasks.filter((scheduledTask) => {
        return scheduledTask.id !== nextScheduledTask.id;
      });
      nextScheduledTask.callback();
    }

    this.nowMilliseconds = targetTimeMilliseconds;
  }
}

test("ChatTranscriptTextSmoother animates a new streamed chunk from empty text", () => {
  const emissions: string[] = [];
  const clock = new ChatTranscriptTextSmootherTestClock();
  const smoother = new ChatTranscriptTextSmoother((text) => {
    emissions.push(text);
  }, clock);

  smoother.update({
    isStreaming: true,
    smooth: true,
    streamKey: "message-1:text:0",
    text: "Hello",
  });

  assert.equal(smoother.currentText, "");
  assert.deepEqual(emissions, []);

  clock.advanceBy(32);
  assert.match(smoother.currentText, /^H.{0,}$/u);
});

test("ChatTranscriptTextSmoother reveals appended streamed text over time", () => {
  const emissions: string[] = [];
  const clock = new ChatTranscriptTextSmootherTestClock();
  const smoother = new ChatTranscriptTextSmoother((text) => {
    emissions.push(text);
  }, clock);

  smoother.update({
    isStreaming: true,
    smooth: true,
    streamKey: "message-1:text:0",
    text: "Hello",
  });
  smoother.update({
    isStreaming: true,
    smooth: true,
    streamKey: "message-1:text:0",
    text: "Hello there friend",
  });

  assert.equal(smoother.currentText, "");

  clock.advanceBy(16);
  assert.match(smoother.currentText, /^H.{0,}$/u);
  assert.notEqual(smoother.currentText, "Hello there friend");

  clock.advanceBy(330);
  assert.equal(smoother.currentText, "Hello there friend");
  assert.equal(emissions.at(-1), "Hello there friend");
});

test("ChatTranscriptTextSmoother restarts from empty text when a new stream key arrives", () => {
  const emissions: string[] = [];
  const clock = new ChatTranscriptTextSmootherTestClock();
  const smoother = new ChatTranscriptTextSmoother((text) => {
    emissions.push(text);
  }, clock);

  smoother.update({
    isStreaming: true,
    smooth: true,
    streamKey: "message-1:text:0",
    text: "Hello there",
  });

  clock.advanceBy(160);
  assert.notEqual(smoother.currentText, "");

  smoother.update({
    isStreaming: true,
    smooth: true,
    streamKey: "message-2:text:0",
    text: "Fresh stream",
  });

  assert.equal(smoother.currentText, "");

  clock.advanceBy(160);
  assert.equal(emissions.at(-1), "Fresh stream");
});

test("ChatTranscriptTextSmoother snaps to the final text when streaming completes", () => {
  const emissions: string[] = [];
  const clock = new ChatTranscriptTextSmootherTestClock();
  const smoother = new ChatTranscriptTextSmoother((text) => {
    emissions.push(text);
  }, clock);

  smoother.update({
    isStreaming: true,
    smooth: true,
    streamKey: "message-1:text:0",
    text: "Hello",
  });
  smoother.update({
    isStreaming: true,
    smooth: true,
    streamKey: "message-1:text:0",
    text: "Hello there friend",
  });

  clock.advanceBy(33);
  assert.notEqual(smoother.currentText, "Hello there friend");

  smoother.update({
    isStreaming: false,
    smooth: true,
    streamKey: "message-1:text:0",
    text: "Hello there friend",
  });

  assert.equal(smoother.currentText, "Hello there friend");
  assert.equal(emissions.at(-1), "Hello there friend");
});
