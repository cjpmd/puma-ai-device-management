import { Activity, Footprints, Target, Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";
import MLTrainingManager from "@/components/MLTrainingManager";
import PlayerMovementMap from "@/components/PlayerMovementMap";
import { processRealTimeData, MetricAggregation } from "@/utils/sensorDataUtils";
import { SensorData } from "@/ml/activityRecognition";

const Index = () => {
  const [metrics, setMetrics] = useState<MetricAggregation>({
    totalSteps: 0,
    ballTouches: 0,
    successfulPasses: 0,
    shotsOnTarget: 0,
    confidence: 0
  });
  const [timeSeriesData, setTimeSeriesData] = useState<Array<{ time: string; value: number }>>([]);

  useEffect(() => {
    // In a real app, this would be replaced with WebSocket or Server-Sent Events
    const interval = setInterval(() => {
      // Simulate incoming sensor data
      const mockData: SensorData[] = Array.from({ length: 10 }, (_, i) => ({
        x: Math.random().toString(),
        y: Math.random().toString(),
        z: Math.random().toString(),
        seconds_elapsed: i.toString(),
        sensor: i % 2 === 0 ? 'Gyroscope' : 'Accelerometer',
        time: new Date().toISOString()
      }));

      const { metrics: newMetrics, timeSeriesData: newTimeSeriesData } = processRealTimeData(mockData);
      setMetrics(newMetrics);
      setTimeSeriesData(prev => [...prev.slice(-50), ...newTimeSeriesData]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary mb-8">Player Performance Dashboard</h1>
        
        <div className="mb-8">
          <MLTrainingManager />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Steps"
            value={metrics.totalSteps}
            unit="steps"
            icon={<Footprints className="h-4 w-4" />}
          />
          <MetricCard
            title="Ball Touches"
            value={metrics.ballTouches}
            unit="touches"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Successful Passes"
            value={metrics.successfulPasses}
            unit="passes"
            icon={<Repeat className="h-4 w-4" />}
            subtitle={`${(metrics.confidence * 100).toFixed(0)}% confidence`}
          />
          <MetricCard
            title="Shots on Target"
            value={metrics.shotsOnTarget}
            unit="shots"
            icon={<Target className="h-4 w-4" />}
            subtitle="95% confidence"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <PerformanceChart
            title="Movement Intensity"
            data={timeSeriesData}
            dataKey="value"
            color="#0F766E"
          />
          <PerformanceChart
            title="Shot Power Analysis"
            data={timeSeriesData}
            dataKey="value"
            color="#EAB308"
          />
        </div>

        <div className="mt-8">
          <PlayerMovementMap />
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-secondary mb-4">Model Training Requirements</h2>
          <div className="space-y-2 text-gray-600">
            <p>Current model training specifications:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Multiple sensor support (Gyroscope, Accelerometer, GPS)</li>
              <li>Real-time data processing and visualization</li>
              <li>Multiple sensor positions (ankle, shin, cleats)</li>
              <li>Video analysis for ground truth labeling</li>
              <li>Impact force threshold: {'>'}5G for shots, 2-4G for passes</li>
              <li>Angular velocity patterns analysis</li>
              <li>Minimum 1000 labeled examples per action type</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;