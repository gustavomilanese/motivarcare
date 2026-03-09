export interface RuntimeState {
  startedAt: number;
  shuttingDown: boolean;
  inFlightRequests: number;
}

export const runtimeState: RuntimeState = {
  startedAt: Date.now(),
  shuttingDown: false,
  inFlightRequests: 0
};

export function markShuttingDown(): void {
  runtimeState.shuttingDown = true;
}
