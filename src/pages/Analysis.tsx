import { Link } from 'react-router-dom';
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";
import PlayerMovementMap from "@/components/PlayerMovementMap";
import { Activity, Footprints, Target, Repeat } from "lucide-react";

const Analysis = () => {
  // Move existing dashboard content from Index.tsx
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-secondary">Performance Analysis</h1>
          <Link to="/ml-training" className="text-primary hover:underline">
            Go to ML Training
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Steps"
            value={0}
            unit="steps"
            icon={<Footprints className="h-4 w-4" />}
          />
          <MetricCard
            title="Ball Touches"
            value={0}
            unit="touches"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Successful Passes"
            value={0}
            unit="passes"
            icon={<Repeat className="h-4 w-4" />}
            subtitle="92% confidence"
          />
          <MetricCard
            title="Shots on Target"
            value={0}
            unit="shots"
            icon={<Target className="h-4 w-4" />}
            subtitle="95% confidence"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <PerformanceChart
            title="Movement Intensity"
            data={[]}
            dataKey="value"
            color="#0F766E"
          />
          <PerformanceChart
            title="Shot Power Analysis"
            data={[]}
            dataKey="value"
            color="#EAB308"
          />
        </div>

        <div className="mt-8">
          <PlayerMovementMap />
        </div>
      </div>
    </div>
  );
};

export default Analysis;