import { Circle, Line, Polyline, Svg, Text, View } from "@react-pdf/renderer";

import { buildLineChartLayout, type ChartDatum } from "@/lib/pdf/chartMath";

const WIDTH = 240;
export const CHART_WIDTH = WIDTH;
const HEIGHT = 90;
const LABEL_ROW_HEIGHT = 14;
const LABEL_COLUMN_WIDTH = 32;
const Y_AXIS_LABEL_WIDTH = 22;

export function MiniLineChart({
  title,
  unit,
  data,
}: {
  title: string;
  unit: string;
  data: ChartDatum[];
}) {
  const { points, coords, xLabels, yTicks, plotLeft, plotRight, plotTop, plotBottom } =
    buildLineChartLayout(data, WIDTH, HEIGHT);

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
                  width: Y_AXIS_LABEL_WIDTH,
                  fontSize: 5,
                  color: "#888888",
                  textAlign: "right",
                }}
              >
                {tick.value.toFixed(1)}
                {unit}
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
