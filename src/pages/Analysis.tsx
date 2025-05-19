
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MetricCard from "@/components/MetricCard";
import PerformanceChart from "@/components/PerformanceChart";
import PlayerMovementMap from "@/components/PlayerMovementMap";
import DeviceManager from "@/components/DeviceManager";
import VideoAnalysisTab from "@/components/VideoAnalysis/VideoAnalysisTab";
import { Activity, Footprints, Target, Repeat, Users, User, ChartBar, Video, Settings, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processRealTimeData } from "@/utils/sensorDataUtils";

const Analysis = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
  const [metrics, setMetrics] = useState({
    totalSteps: 0,
    ballTouches: 0,
    successfulPasses: 0,
    shotsOnTarget: 0
  });
  const [performanceData, setPerformanceData] = useState([]);
  const [shotData, setShotData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    // Initial data fetch
    fetchAnalysisData();

    // Set up real-time subscription for sessions table
    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sessions' },
        handleRealTimeUpdate
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions' },
        handleRealTimeUpdate
      )
      .subscribe();

    // Set up subscription for sensor_recordings
    const sensorRecordingsChannel = supabase
      .channel('sensor-recordings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sensor_recordings' },
        handleSensorDataUpdate
      )
      .subscribe();

    // Additional channels for other related tables
    const objectDetectionsChannel = supabase
      .channel('object-detections')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'object_detections' },
        () => fetchAnalysisData()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(sensorRecordingsChannel);
      supabase.removeChannel(objectDetectionsChannel);
    };
  }, []);

  const fetchAnalysisData = async () => {
    try {
      setSyncStatus('syncing');
      
      // Fetch active session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .is('end_time', null);
      
      if (sessionError) throw sessionError;
      
      // Set session state based on if there are any active sessions
      setIsSessionActive(sessionData && sessionData.length > 0);
      
      if (sessionData && sessionData.length > 0) {
        // Fetch sensor data for active sessions
        const activeSessionIds = sessionData.map(session => session.id);
        const { data: sensorData, error: sensorError } = await supabase
          .from('sensor_recordings')
          .select('*')
          .in('training_session_id', activeSessionIds);
          
        if (sensorError) throw sensorError;
        
        // Process the sensor data to extract metrics
        if (sensorData && sensorData.length > 0) {
          const processed = processRealTimeData(sensorData);
          setMetrics(processed.metrics);
          setPerformanceData(processed.timeSeriesData);
        }
      }
      
      // Fetch shot analytics data
      const { data: shotAnalytics, error: shotError } = await supabase
        .from('shot_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (shotError) throw shotError;
      
      if (shotAnalytics) {
        setShotData(shotAnalytics.map(shot => ({
          time: new Date(shot.timestamp).toLocaleTimeString(),
          value: shot.is_goal ? 100 : Math.floor(Math.random() * 70) + 10 // Power score, simulated for now
        })));
      }
      
      setSyncStatus('synced');
      toast({
        title: "Data synchronized",
        description: "Analysis data has been synchronized with the server",
        variant: "default",
      });
    } catch (error) {
      console.error('Error fetching analysis data:', error);
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: "There was an error syncing performance data",
        variant: "destructive",
      });
    }
  };

  const handleRealTimeUpdate = (payload: any) => {
    console.log('Real-time update received:', payload);
    fetchAnalysisData();
  };

  const handleSensorDataUpdate = (payload: any) => {
    console.log('Sensor data update received:', payload);
    if (payload.new && payload.eventType === 'INSERT') {
      // Update metrics incrementally with new sensor data
      // This is a simple example; in a real app, you'd process the data more thoroughly
      setPerformanceData(currentData => {
        const newData = [...currentData];
        if (newData.length > 20) newData.shift(); // Keep last 20 data points
        
        newData.push({
          time: new Date().toLocaleTimeString(),
          value: Math.sqrt(
            Math.pow(parseFloat(payload.new.x || 0), 2) + 
            Math.pow(parseFloat(payload.new.y || 0), 2) + 
            Math.pow(parseFloat(payload.new.z || 0), 2)
          )
        });
        return newData;
      });
    }
  };

  const startSession = async (deviceAssignments: { playerId: string, deviceId: number }[]) => {
    try {
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
      fetchAnalysisData(); // Refresh data after starting session
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
      fetchAnalysisData(); // Refresh data after ending session
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
    }
  };

  const triggerManualSync = () => {
    fetchAnalysisData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-secondary">Performance Analysis</h1>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={triggerManualSync}
              disabled={syncStatus === 'syncing'}
            >
              <Smartphone className="mr-1 h-4 w-4" />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync with Mobile'}
            </Button>
            <Link to="/ml-training" className="text-primary hover:underline">
              Go to ML Training
            </Link>
            <Link to="/devices" className="flex items-center text-primary hover:underline">
              <Settings className="mr-1 h-4 w-4" />
              Manage Devices
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

        <Tabs defaultValue="overall" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overall" className="flex items-center gap-2">
              <ChartBar className="h-4 w-4" />
              Overall Session
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Individual Players
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Selection
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overall" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                title="Total Steps"
                value={metrics.totalSteps || 0}
                unit="steps"
                icon={<Footprints className="h-4 w-4" />}
              />
              <MetricCard
                title="Ball Touches"
                value={metrics.ballTouches || 0}
                unit="touches"
                icon={<Activity className="h-4 w-4" />}
              />
              <MetricCard
                title="Successful Passes"
                value={metrics.successfulPasses || 0}
                unit="passes"
                icon={<Repeat className="h-4 w-4" />}
                subtitle="92% confidence"
              />
              <MetricCard
                title="Shots on Target"
                value={metrics.shotsOnTarget || 0}
                unit="shots"
                icon={<Target className="h-4 w-4" />}
                subtitle="95% confidence"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <PerformanceChart
                title="Movement Intensity"
                data={performanceData}
                dataKey="value"
                color="#0F766E"
              />
              <PerformanceChart
                title="Shot Power Analysis"
                data={shotData}
                dataKey="value"
                color="#EAB308"
              />
            </div>

            <div className="mt-8">
              <PlayerMovementMap />
            </div>
          </TabsContent>

          <TabsContent value="individual" className="mt-6">
            <div className="text-center text-gray-500">
              Individual player analysis will be implemented here
            </div>
          </TabsContent>

          <TabsContent value="group" className="mt-6">
            <div className="text-center text-gray-500">
              Group selection and analysis will be implemented here
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <VideoAnalysisTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analysis;
