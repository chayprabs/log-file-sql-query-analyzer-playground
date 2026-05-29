/** Thrown when the user cancels an in-flight file load. */
export class LoadCancelledError extends Error {
  constructor() {
    super("File loading cancelled.");
    this.name = "LoadCancelledError";
  }
}

export function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new LoadCancelledError();
  }
}

export async function yieldToMainThread(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
