
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Play, Pause, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { SensorData, validateSensorLoggerData } from '@/ml/activityRecognition';

interface DataUploadTabProps {
  isRecording: boolean;
  totalPossessionTime: number;
  currentSessionId: string | null;
  onVideoUpload: (videoURL: string) => void;
  onSensorDataUpload: (sensorData: SensorData[]) => void;
  onToggleRecording: () => void;
}

const DataUploadTab = ({
  isRecording,
  totalPossessionTime,
  currentSessionId,
  onVideoUpload,
  onSensorDataUpload,
  onToggleRecording,
}: DataUploadTabProps) => {
  const { toast } = useToast();

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a local URL for the video file
      const videoURL = URL.createObjectURL(file);
      onVideoUpload(videoURL);
      
      toast({
        title: "Video stored locally",
        description: "Video file has been stored locally. You can now add temporal annotations.",
      });
    }
  };

  const handleSensorDataUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentSessionId) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (validateSensorLoggerData(data)) {
            const rawData = data as SensorData[];
            onSensorDataUpload(rawData);
            
            // Store sensor recordings in Supabase
            const sensorRecordings = rawData.map(reading => ({
              training_session_id: currentSessionId,
              sensor_type: reading.sensor,
              x: parseFloat(reading.x),
              y: parseFloat(reading.y),
              z: parseFloat(reading.z),
              timestamp: new Date(reading.time).getTime()
            }));

            const { error } = await supabase
              .from('sensor_recordings')
              .insert(sensorRecordings);

            if (error) {
              console.error('Error storing sensor data:', error);
              toast({
                title: "Error",
                description: "Failed to store sensor data",
                variant: "destructive",
              });
              return;
            }

            toast({
              title: "Sensor data loaded",
              description: "Sensor data has been validated and stored. Now you can add annotations.",
            });
          } else {
            toast({
              title: "Error",
              description: "Invalid Sensor Logger data format",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error processing sensor data:', error);
          toast({
            title: "Error",
            description: "Failed to parse sensor data",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Error",
        description: "No active training session",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Workflow: <br/>
          1. Record sensor data using Sensor Logger on your Apple Watch<br/>
          2. Record video separately on another device<br/>
          3. Use VGG Image Annotator (VIA) to add activity timestamps to your video<br/>
          4. Click "Start Recording" to begin a training session<br/>
          5. Upload your video and Sensor Logger JSON files<br/>
          6. Either manually add annotations or import from VIA JSON<br/>
          7. Process annotations to create training examples<br/>
          8. Click "Stop Recording" when complete
        </AlertDescription>
      </Alert>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Upload Training Data</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm mb-2">Video Recording</label>
            <Input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="cursor-pointer"
              disabled={!isRecording}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-2">Sensor Logger Data (JSON)</label>
            <Input
              type="file"
              accept=".json"
              onChange={handleSensorDataUpload}
              className="cursor-pointer"
              disabled={!isRecording}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Recording Controls</h3>
        <div className="flex gap-4 items-center">
          <Button
            variant={isRecording ? 'destructive' : 'default'}
            onClick={onToggleRecording}
          >
            {isRecording ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          <div className="text-sm">
            Total possession time: {Math.round(totalPossessionTime / 1000)}s
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUploadTab;
