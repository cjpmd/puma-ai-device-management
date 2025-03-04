
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityType } from "@/ml/activityRecognition";

interface ConfusionMatrixProps {
  matrix: number[][];
  labels: ActivityType[];
  title?: string;
}

const ConfusionMatrix = ({ matrix, labels, title = "Confusion Matrix" }: ConfusionMatrixProps) => {
  // Calculate color intensity based on value
  const getColorIntensity = (value: number, rowTotal: number) => {
    if (rowTotal === 0) return "bg-gray-100";
    const percentage = value / rowTotal;
    if (percentage >= 0.8) return "bg-green-700 text-white";
    if (percentage >= 0.6) return "bg-green-500 text-white";
    if (percentage >= 0.4) return "bg-green-300";
    if (percentage >= 0.2) return "bg-green-200";
    if (percentage > 0) return "bg-green-100";
    return "bg-gray-100";
  };

  // Calculate row totals for percentage calculations
  const rowTotals = matrix.map(row => row.reduce((sum, val) => sum + val, 0));

  // Calculate overall accuracy
  const totalSamples = rowTotals.reduce((sum, val) => sum + val, 0);
  const correctPredictions = matrix.reduce((sum, row, i) => sum + row[i], 0);
  const overallAccuracy = totalSamples > 0 ? (correctPredictions / totalSamples) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        <div className="text-sm text-muted-foreground">
          Overall Accuracy: {overallAccuracy.toFixed(1)}%
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-xs p-1 border bg-gray-100">Actual ↓ Predicted →</th>
                {labels.map((label, i) => (
                  <th key={i} className="text-xs p-1 border bg-gray-100 whitespace-nowrap">
                    {label.replace('_', ' ')}
                  </th>
                ))}
                <th className="text-xs p-1 border bg-gray-100">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i}>
                  <th className="text-xs p-1 border bg-gray-100 whitespace-nowrap">
                    {labels[i].replace('_', ' ')}
                  </th>
                  {row.map((value, j) => (
                    <td 
                      key={j} 
                      className={`text-xs p-1 border text-center ${getColorIntensity(value, rowTotals[i])}`}
                    >
                      {value} {rowTotals[i] > 0 && <span className="text-[10px]">({((value / rowTotals[i]) * 100).toFixed(0)}%)</span>}
                    </td>
                  ))}
                  <td className="text-xs p-1 border bg-gray-50 text-center font-medium">
                    {rowTotals[i]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfusionMatrix;
