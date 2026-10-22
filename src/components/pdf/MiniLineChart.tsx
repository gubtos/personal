import { Circle, Line, Polyline, Svg, Text, View } from "@react-pdf/renderer";

import { buildLineChartLayout, type ChartDatum } from "@/lib/pdf/chartMath";

const WIDTH = 240;
export const CHART_WIDTH = WIDTH;
const HEIGHT = 90;
const LABEL_ROW_HEIGHT = 14;
const LABEL_COLUMN_WIDTH = 32;
const Y_AXIS_LABEL_WIDTH = 22;
const Y_AXIS_LABEL_GAP = 4;
/** Rough Helvetica advance width per character at the 5pt Y-axis label size. */
const Y_LABEL_CHAR_WIDTH = 2.8;
/** Matches the dashed `CartesianGrid` used by the on-screen Recharts charts. */
const GRID_COLOR = "#e5e5e5";
const GRID_DASH = "3 3";

function formatTickLabel(value: number, decimals: number, unit: string) {
  return `${value.toFixed(decimals)}${unit}`;
}

export function MiniLineChart({
  title,
  unit,
  decimals = 1,
  data,
}: {
  title: string;
  unit: string;
  decimals?: number;
  data: ChartDatum[];
}) {
  // Tick values don't depend on the gutter width, so size the label column from a first pass
  // and only re-run the layout when the labels need more room than the default column allows.
  const baseLayout = buildLineChartLayout(data, WIDTH, HEIGHT);
  const labelWidth = Math.max(
    Y_AXIS_LABEL_WIDTH,
    ...baseLayout.yTicks.map(
      (tick) =>
        formatTickLabel(tick.value, decimals, unit).length * Y_LABEL_CHAR_WIDTH,
    ),
  );
  const { points, coords, xLabels, yTicks, plotLeft, plotRight, plotTop, plotBottom } =
    labelWidth > Y_AXIS_LABEL_WIDTH
      ? buildLineChartLayout(data, WIDTH, HEIGHT, labelWidth + Y_AXIS_LABEL_GAP)
      : baseLayout;

  return (
    <View wrap={false} style={{ width: WIDTH, paddingRight: 10, marginBottom: 12 }}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
        {title}
      </Text>
      {coords.length === 0 ? (
        <Text style={{ fontSize: 7, color: "#999999" }}>Sem dados suficientes</Text>
      ) : (
        <>
          <View style={{ position: "relative", width: WIDTH, height: HEIGHT }}>
            <Svg width={WIDTH} height={HEIGHT}>
              {/* Grid first so the axes and the series paint over it. */}
              {yTicks.map((tick, i) => (
                <Line
                  key={`grid-h-${i}`}
                  x1={plotLeft}
                  y1={tick.y}
                  x2={plotRight}
                  y2={tick.y}
                  stroke={GRID_COLOR}
                  strokeDasharray={GRID_DASH}
                  strokeWidth={0.5}
                />
              ))}
              {xLabels.map((xl, i) => (
                <Line
                  key={`grid-v-${i}`}
                  x1={xl.x}
                  y1={plotTop}
                  x2={xl.x}
                  y2={plotBottom}
                  stroke={GRID_COLOR}
                  strokeDasharray={GRID_DASH}
                  strokeWidth={0.5}
                />
              ))}
              <Line
                x1={plotLeft}
                y1={plotTop}
                x2={plotLeft}
                y2={plotBottom}
                stroke="#d4d4d4"
                strokeWidth={0.5}
              />
              <Line
                x1={plotLeft}
                y1={plotBottom}
                x2={plotRight}
                y2={plotBottom}
                stroke="#d4d4d4"
                strokeWidth={0.5}
              />
              {yTicks.map((tick, i) => (
                <Line
                  key={i}
                  x1={plotLeft - 3}
                  y1={tick.y}
                  x2={plotLeft}
                  y2={tick.y}
                  stroke="#d4d4d4"
                  strokeWidth={0.5}
                />
              ))}
              <Polyline
                points={points}
                fill="none"
                stroke="#0f766e"
                strokeWidth={1.5}
              />
              {coords.map((c, i) => (
                <Circle key={i} cx={c.x} cy={c.y} r={1.6} fill="#0f766e" />
              ))}
            </Svg>
            {yTicks.map((tick, i) => (
              <Text
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  top: tick.y - 3,
                  width: labelWidth,
                  fontSize: 5,
                  color: "#888888",
                  textAlign: "right",
                }}
              >
                {formatTickLabel(tick.value, decimals, unit)}
              </Text>
            ))}
          </View>
          <View style={{ position: "relative", width: WIDTH, height: LABEL_ROW_HEIGHT }}>
            {/* "Nº N" + evaluation date shown on the X axis. */}
            {xLabels.map((xl, i) => (
              <Text
                key={i}
                style={{
                  position: "absolute",
                  left: xl.x - LABEL_COLUMN_WIDTH / 2,
                  top: 0,
                  width: LABEL_COLUMN_WIDTH,
                  fontSize: 5,
                  color: "#888888",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                {xl.label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
