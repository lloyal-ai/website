/** Pure timeline helpers. Scene state can be reproduced at any timestamp. */
export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function progress(time, start, end) {
  return end <= start ? Number(time >= end) : clamp((time - start) / (end - start));
}

export function ease(value) {
  const p = clamp(value);
  return p * p * (3 - 2 * p);
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function windowed(time, start, end, fade = 0.2) {
  if (time < start || time > end) return 0;
  if (fade <= 0) return 1;
  const duration = Math.min(fade, Math.max(0, (end - start) / 2));
  return Math.min(ease(progress(time, start, start + duration)), 1 - ease(progress(time, end - duration, end)));
}

/** Returns a point a normalized distance along an angular route. No SVG measurement. */
export function pointOnPolyline(points, amount) {
  if (!points.length) return { x: 0, y: 0 };
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  let distance = lengths.reduce((sum, length) => sum + length, 0) * clamp(amount);
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (distance <= length && length > 0) {
      const fraction = distance / length;
      return { x: lerp(points[index][0], points[index + 1][0], fraction), y: lerp(points[index][1], points[index + 1][1], fraction) };
    }
    distance -= length;
  }
  const [x, y] = points[points.length - 1];
  return { x, y };
}
