import type { FinishCode } from '../types/production.types';

// Surface finishes from the Alco price list (code -> readable label).
export const FINISH_LABELS: Record<FinishCode, string> = {
  NA: 'Natural Anodized',
  PC: 'Powder Coated',
  MF: 'Mill Finish',
  BR: 'Bronze Anodized',
  WF: 'Wood Finish',
};

export const FINISH_OPTIONS: { value: FinishCode; label: string }[] = (
  Object.keys(FINISH_LABELS) as FinishCode[]
).map((code) => ({ value: code, label: `${code} — ${FINISH_LABELS[code]}` }));

// Standard extrusion lengths from the price list, stored in millimetres.
export const STANDARD_LENGTH_OPTIONS: { value: number; label: string }[] = [
  { value: 6500, label: '6.5 m' },
  { value: 6100, label: '6.1 m' },
  { value: 3660, label: '3.66 m' },
];

export function finishLabel(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  return FINISH_LABELS[code as FinishCode] ?? code;
}

const MM_PER_METRE = 1000;
const MM_PER_FOOT = 304.8;

export function formatStandardLength(lengthMm: number | null | undefined): string {
  if (typeof lengthMm !== 'number' || !Number.isFinite(lengthMm) || lengthMm <= 0) {
    return '—';
  }

  const metres = lengthMm / MM_PER_METRE;
  return `${Number(metres.toFixed(2))} m`;
}

export function formatLengthFeet(lengthMm: number | null | undefined): string {
  if (typeof lengthMm !== 'number' || !Number.isFinite(lengthMm) || lengthMm <= 0) {
    return '—';
  }

  return `${(lengthMm / MM_PER_FOOT).toFixed(1)} ft`;
}

export function formatPieces(pieces: number | null | undefined): string {
  if (typeof pieces !== 'number' || !Number.isFinite(pieces) || pieces < 0) {
    return '—';
  }

  return `${pieces.toLocaleString()} pcs`;
}
