export const PANEL_TAP_COOLDOWN_MS = 300;

export function createPanelTapCooldown() {
 let previous = -Infinity;
 return {
  blocked(now) { return now-previous < PANEL_TAP_COOLDOWN_MS; },
  mark(now) { previous=now; },
 };
}
