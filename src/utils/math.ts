import type { Position } from '../types';

export function distance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(vec: Position): Position {
  const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: vec.x / len, y: vec.y / len };
}

export function direction(from: Position, to: Position): Position {
  return normalize({ x: to.x - from.x, y: to.y - from.y });
}
