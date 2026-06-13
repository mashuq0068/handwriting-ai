/**
 * Timeline helpers — map dates ↔ canvas X positions based on quarter columns.
 */

export interface Quarter {
  label: string;
  start: Date; // inclusive
  end: Date;   // exclusive (start of next quarter)
}

/** Build quarter metadata from labels like "Q1 2026" */
export function parseQuarters(labels: string[]): Quarter[] {
  return labels.map((label) => {
    const [q, year] = label.split(" ");
    const qNum = parseInt(q.replace("Q", ""), 10);
    const y = parseInt(year, 10);
    const startMonth = (qNum - 1) * 3; // 0-indexed
    const start = new Date(y, startMonth, 1);
    const end = new Date(y, startMonth + 3, 1);
    return { label, start, end };
  });
}

/**
 * Convert a date string (YYYY-MM-DD) to a canvas X position.
 * Returns null if the date falls outside the defined quarters.
 */
export function dateToCanvasX(
  dateStr: string,
  quarters: Quarter[],
  quarterWidth: number
): number | null {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;

  for (let i = 0; i < quarters.length; i++) {
    const q = quarters[i];
    if (d >= q.start && d < q.end) {
      const progress = (d.getTime() - q.start.getTime()) / (q.end.getTime() - q.start.getTime());
      return i * quarterWidth + progress * quarterWidth;
    }
  }

  // Before first quarter — clamp to start
  if (d < quarters[0].start) return 0;
  // After last quarter — clamp to end
  return quarters.length * quarterWidth;
}

/**
 * Reverse-map a canvas X position back to an approximate date string (YYYY-MM-DD).
 */
export function canvasXToDate(
  x: number,
  quarters: Quarter[],
  quarterWidth: number
): string {
  const totalWidth = quarters.length * quarterWidth;
  const clampedX = Math.max(0, Math.min(x, totalWidth - 1));

  const quarterIndex = Math.min(
    Math.floor(clampedX / quarterWidth),
    quarters.length - 1
  );
  const q = quarters[quarterIndex];
  const progress = (clampedX - quarterIndex * quarterWidth) / quarterWidth;

  const ms = q.start.getTime() + progress * (q.end.getTime() - q.start.getTime());
  const d = new Date(ms);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Minimum width for a date-driven item (in px) */
export const MIN_DATE_WIDTH = 80;
