import { Circle, Line, Polyline, Svg, Text, View } from "@react-pdf/renderer";

import { buildLineChartLayout, type ChartDatum } from "@/lib/pdf/chartMath";

const WIDTH = 240;
const HEIGHT = 90;

export function MiniLineChart({
  title,
  unit,
  data,
}: {
  title: string;
  unit: string;
  data: ChartDatum[];
}) {
  const { points, minValue, maxValue, coords } = buildLineChartLayout(
    data,
    WIDTH,
    HEIGHT,
  );

  return (
    <View style={{ width: WIDTH, paddingRight: 10, marginBottom: 12 }}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
        {title}
      </Text>
      {coords.length === 0 ? (
        <Text style={{ fontSize: 7, color: "#999999" }}>Sem dados suficientes</Text>
      ) : (
        <>
          <Svg width={WIDTH} height={HEIGHT}>
            <Line
              x1={4}
              y1={HEIGHT - 8}
              x2={WIDTH - 4}
              y2={HEIGHT - 8}
              stroke="#d4d4d4"
              strokeWidth={0.5}
            />
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
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 6, color: "#888888" }}>
              {minValue.toFixed(1)}
              {unit}
            </Text>
            <Text style={{ fontSize: 6, color: "#888888" }}>
              {maxValue.toFixed(1)}
              {unit}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
