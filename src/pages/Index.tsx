import { Activity, FootPrints, Target, Repeat } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";

// Sample data - this would come from your sensor/database in a real implementation
const sampleTimeSeriesData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}:00`,
  value: Math.floor(Math.random() * 100),
}));

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary mb-8">Player Performance Dashboard</h1>
        
        {/* Current Session Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Steps"
            value={8432}
            unit="steps"
            icon={<FootPrints className="h-4 w-4" />}
          />
          <MetricCard
            title="Ball Touches"
            value={127}
            unit="touches"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Successful Passes"
            value={45}
            unit="passes"
            icon={<Repeat className="h-4 w-4" />}
          />
          <MetricCard
            title="Shots on Target"
            value={3}
            unit="shots"
            icon={<Target className="h-4 w-4" />}
          />
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceChart
            title="Steps Over Time"
            data={sampleTimeSeriesData}
            dataKey="value"
            color="#0F766E"
          />
          <PerformanceChart
            title="Ball Touches Frequency"
            data={sampleTimeSeriesData}
            dataKey="value"
            color="#EAB308"
          />
        </div>

        {/* Training Notes */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-secondary mb-4">Training Model Requirements</h2>
          <div className="space-y-2 text-gray-600">
            <p>To accurately track these metrics, you would need:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Accelerometer data at 100+ Hz sampling rate</li>
              <li>Machine learning model trained on labeled movement patterns</li>
              <li>Ground truth data from video analysis for model training</li>
              <li>Multiple sensors for improved accuracy (ankle, shin, cleats)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;