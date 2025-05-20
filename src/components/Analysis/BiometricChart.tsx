
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface BiometricChartProps {
  title: string;
  data: Array<{
    time: string;
    value: number;
  }>;
  color: string;
  unit?: string;
  threshold?: number;
  thresholdDirection?: "above" | "below";
}

const BiometricChart = ({ 
  title, 
  data, 
  color, 
  unit = "", 
  threshold,
  thresholdDirection = "above" 
}: BiometricChartProps) => {
  // Calculate if there are threshold violations
  const hasViolations = threshold !== undefined && data.some(item => {
    return thresholdDirection === "above" 
      ? item.value > threshold
      : item.value < threshold;
  });

  // Custom tooltip formatter
  const formatTooltipValue = (value: number) => {
    return `${value}${unit}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
          {hasViolations && (
            <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          )}
        </CardTitle>
        {threshold && (
          <div className="text-xs text-muted-foreground">
            Threshold: {threshold}{unit} {thresholdDirection === "above" ? "(max)" : "(min)"}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}${unit}`} 
              />
              <Tooltip 
                formatter={(value: number) => formatTooltipValue(value)} 
              />
              {threshold && (
                <ReferenceLine 
                  y={threshold} 
                  stroke={thresholdDirection === "above" ? "rgba(239, 68, 68, 0.7)" : "rgba(14, 165, 233, 0.7)"}
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `${threshold}${unit}`, 
                    position: 'insideBottomRight',
                    fill: thresholdDirection === "above" ? "rgba(239, 68, 68, 0.7)" : "rgba(14, 165, 233, 0.7)",
                    fontSize: 10
                  }} 
                />
              )}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2} 
                dot={{ r: 3 }} 
                activeDot={{ r: 5 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BiometricChart;
