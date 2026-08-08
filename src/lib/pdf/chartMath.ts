export interface ChartDatum {
  label: string;
  value: number | null;
}

export interface ChartCoord {
  x: number;
  y: number;
  label: string;
  value: number;
}

export interface ChartLayout {
  points: string;
  minValue: number;
  maxValue: number;
  coords: ChartCoord[];
}

/** Computes SVG polyline coordinates for a simple line chart, skipping points with no data. */
export function buildLineChartLayout(
  data: ChartDatum[],
  width: number,
  height: number,
  paddingX = 6,
  paddingY = 10,
): ChartLayout {
  const defined = data
    .map((d, index) => ({ ...d, index }))
    .filter((d): d is (typeof d & { value: number }) => d.value !== null);

  if (defined.length === 0) {
    return { points: "", minValue: 0, maxValue: 0, coords: [] };
  }

  const values = defined.map((d) => d.value);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const coords: ChartCoord[] = defined.map((d) => {
    const x = paddingX + d.index * stepX;
    const t = (d.value - minValue) / (maxValue - minValue);
    const y = paddingY + (1 - t) * innerHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const points = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return { points, minValue, maxValue, coords };
}
