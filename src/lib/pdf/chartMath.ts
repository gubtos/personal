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
  xLabels: { x: number; label: string }[];
  yTicks: { y: number; value: number }[];
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
}

const Y_TICK_COUNT = 4;

/** Computes SVG polyline coordinates for a simple line chart, skipping points with no data. */
export function buildLineChartLayout(
  data: ChartDatum[],
  width: number,
  height: number,
  paddingLeft = 26,
  paddingRight = 6,
  paddingY = 10,
): ChartLayout {
  const innerWidth = width - paddingLeft - paddingRight;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  const xLabels = data.map((d, index) => ({
    x: paddingLeft + index * stepX,
    label: d.label,
  }));

  const plotLeft = paddingLeft;
  const plotRight = width - paddingRight;
  const plotTop = paddingY;
  const plotBottom = height - paddingY;

  const defined = data
    .map((d, index) => ({ ...d, index }))
    .filter((d): d is (typeof d & { value: number }) => d.value !== null);

  if (defined.length === 0) {
    return {
      points: "",
      minValue: 0,
      maxValue: 0,
      coords: [],
      xLabels,
      yTicks: [],
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
    };
  }

  const values = defined.map((d) => d.value);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  const innerHeight = height - paddingY * 2;

  const coords: ChartCoord[] = defined.map((d) => {
    const x = paddingLeft + d.index * stepX;
    const t = (d.value - minValue) / (maxValue - minValue);
    const y = paddingY + (1 - t) * innerHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const points = coords.map((c) => `${c.x},${c.y}`).join(" ");

  const yTicks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, i) => {
    const value = minValue + ((maxValue - minValue) * i) / Y_TICK_COUNT;
    const t = (value - minValue) / (maxValue - minValue);
    const y = paddingY + (1 - t) * innerHeight;
    return { y, value };
  });

  return {
    points,
    minValue,
    maxValue,
    coords,
    xLabels,
    yTicks,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
  };
}
