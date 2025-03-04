
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TrainingChartProps {
  data: {
    epoch: number;
    loss?: number;
    accuracy?: number;
    valLoss?: number;
    valAccuracy?: number;
  }[];
  title?: string;
}

const TrainingChart = ({ data, title = "Training Progress" }: TrainingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Format data for chart display
  const chartData = data.map(point => ({
    epoch: point.epoch,
    loss: point.loss !== undefined ? Number(point.loss.toFixed(4)) : undefined,
    accuracy: point.accuracy !== undefined ? Number((point.accuracy * 100).toFixed(2)) : undefined,
    valLoss: point.valLoss !== undefined ? Number(point.valLoss.toFixed(4)) : undefined,
    valAccuracy: point.valAccuracy !== undefined ? Number((point.valAccuracy * 100).toFixed(2)) : undefined,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent ref={chartContainerRef}>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }} />
              <YAxis 
                yAxisId="left" 
                label={{ value: 'Loss', angle: -90, position: 'insideLeft' }} 
                orientation="left" 
              />
              <YAxis 
                yAxisId="right" 
                label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight' }}
                orientation="right" 
                domain={[0, 100]} 
              />
              <Tooltip formatter={(value, name) => {
                if (name === 'accuracy' || name === 'valAccuracy') {
                  return [`${value}%`, name === 'accuracy' ? 'Train Accuracy' : 'Val Accuracy'];
                }
                return [value, name === 'loss' ? 'Train Loss' : 'Val Loss'];
              }} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="loss" 
                stroke="#8884d8" 
                fillOpacity={0.1}
                fill="#8884d8" 
                yAxisId="left"
                name="Train Loss"
              />
              <Area 
                type="monotone" 
                dataKey="valLoss" 
                stroke="#82ca9d" 
                fillOpacity={0.1}
                fill="#82ca9d" 
                yAxisId="left" 
                name="Val Loss"
              />
              <Area 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#ff7300" 
                fillOpacity={0.1}
                fill="#ff7300" 
                yAxisId="right"
                name="Train Accuracy"
              />
              <Area 
                type="monotone" 
                dataKey="valAccuracy" 
                stroke="#0088fe" 
                fillOpacity={0.1}
                fill="#0088fe" 
                yAxisId="right"
                name="Val Accuracy"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainingChart;
