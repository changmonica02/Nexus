export const REFRESH_PULL_THRESHOLD = 80;
export function measureRefreshPull(dx: number, dy: number, elapsed: number) {
  const cancelled = dy < -8 || (Math.abs(dx) > 16 && Math.abs(dx) > Math.max(0, dy) * 0.6);
  const distance = cancelled ? 0 : Math.min(100, Math.max(0, dy - 24) * 0.35);
  return { cancelled, distance, ready: !cancelled && distance >= REFRESH_PULL_THRESHOLD && elapsed >= 500 };
}
