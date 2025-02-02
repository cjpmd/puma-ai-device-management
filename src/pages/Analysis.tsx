import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";
import PlayerMovementMap from "@/components/PlayerMovementMap";
import DeviceManager from "@/components/DeviceManager";
import { Activity, Footprints, Target, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Analysis = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const { toast } = useToast();

  const startSession = async (deviceAssignments: { playerId: string, deviceId: number }[]) => {
    try {
      // Create a new session for each device assignment
      const timestamp = new Date().toISOString();
      
      const promises = deviceAssignments.map(assignment => {
        return supabase.from('sessions').insert({
          player_id: assignment.playerId,
          device_id: assignment.deviceId,
          session_type: 'training',
          start_time: timestamp
        });
      });

      await Promise.all(promises);
      
      setIsSessionActive(true);
      toast({
        title: "Session Started",
        description: "Successfully started tracking session",
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      });
    }
  };

  const endSession = async () => {
    try {
      const timestamp = new Date().toISOString();
      
      const { error } = await supabase
        .from('sessions')
        .update({ end_time: timestamp })
        .is('end_time', null);

      if (error) throw error;
      
      setIsSessionActive(false);
      toast({
        title: "Session Ended",
        description: "Successfully ended tracking session",
      });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-secondary">Performance Analysis</h1>
          <div className="flex gap-4">
            <Link to="/ml-training" className="text-primary hover:underline">
              Go to ML Training
            </Link>
            {!isSessionActive ? (
              <DeviceManager onStartSession={startSession} />
            ) : (
              <Button 
                variant="destructive"
                onClick={endSession}
              >
                End Session
              </Button>
            )}
          </div>
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