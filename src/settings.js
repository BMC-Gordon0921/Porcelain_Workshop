export const SETTINGS_KEY = 'terra-workshop-settings';

export function defaultJoystick(orientation) {
  return {x: orientation === 'landscape' ? 0 : 100, y: 0};
}

export function readSettings(serialized) {
  let data;
  try { data = JSON.parse(serialized); } catch {}
  const percent = (value, fallback) => Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value))) : fallback;
  const joystick = orientation => {
    const fallback = defaultJoystick(orientation);
    const position = data?.[orientation];
    return {x: percent(position?.x, fallback.x), y: percent(position?.y, fallback.y)};
  };
  return {
    effects: percent(data?.effects, 100),
    music: percent(data?.music, 100),
    portrait: joystick('portrait'),
    landscape: joystick('landscape'),
  };
}
