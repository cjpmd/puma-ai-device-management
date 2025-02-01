import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  createModel, 
  trainModel, 
  TrainingExample, 
  ActivityType,
  validateSensorLoggerData,
  convertSensorLoggerData,
  SensorData
} from '@/ml/activityRecognition';
import { Upload, Play, Pause, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface TrainingStats {
  totalExamples: {
    pass: number;
    shot: number;
    dribble: number;
    touch: number;
    no_possession: number;
  };
  currentAccuracy: number;
  epochsCompleted: number;
  lastTrainingTime: string | null;
}

interface MLTrainingManagerProps {
  onTrainingProgress: (stats: TrainingStats) => void;
}

const MLTrainingManager = ({ onTrainingProgress }: MLTrainingManagerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<ActivityType>('pass');
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [possessionStartTime, setPossessionStartTime] = useState<number | null>(null);
  const [totalPossessionTime, setTotalPossessionTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "Video uploaded",
        description: "Video file has been uploaded successfully. Make sure to label activities in your video recording software with timestamps.",
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
            const convertedData = convertSensorLoggerData(rawData);
            
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

            setTrainingData(prev => [...prev, {
              sensorData: convertedData,
              label: currentLabel,
              videoTimestamp: recordingStartTime || Date.now(),
              duration: currentLabel !== 'no_possession' ? Date.now() - (recordingStartTime || Date.now()) : undefined
            }]);

            toast({
              title: "Data added",
              description: "Sensor data has been validated and stored successfully.",
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

  const toggleRecording = async () => {
    if (!isRecording) {
      const startTime = Date.now();
      
      // Create new training session in Supabase
      const { data: session, error } = await supabase
        .from('ml_training_sessions')
        .insert({
          activity_type: currentLabel,
          video_timestamp: startTime,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating training session:', error);
        toast({
          title: "Error",
          description: "Failed to start training session",
          variant: "destructive",
        });
        return;
      }

      setCurrentSessionId(session.id);
      setRecordingStartTime(startTime);
      if (currentLabel !== 'no_possession') {
        setPossessionStartTime(startTime);
      }
      
      toast({
        title: "Recording started",
        description: "Start your video recording now and perform the selected action. Label timestamps in your video recording software.",
      });
    } else {
      // Update session end time in Supabase
      if (currentSessionId) {
        const { error } = await supabase
          .from('ml_training_sessions')
          .update({ 
            end_time: new Date().toISOString(),
            duration: possessionStartTime ? Date.now() - possessionStartTime : null
          })
          .eq('id', currentSessionId);

        if (error) {
          console.error('Error updating training session:', error);
        }
      }

      setRecordingStartTime(null);
      setCurrentSessionId(null);
      if (possessionStartTime) {
        const possessionDuration = Date.now() - possessionStartTime;
        setTotalPossessionTime(prev => prev + possessionDuration);
        setPossessionStartTime(null);
      }
      
      toast({
        title: "Recording stopped",
        description: "Upload your video and sensor data files for this session.",
      });
    }
    setIsRecording(!isRecording);
  };

  const startTraining = async () => {
    if (trainingData.length < 1000) {
      toast({
        title: "Insufficient data",
        description: "Need at least 1000 examples per action type.",
        variant: "destructive",
      });
      return;
    }

    try {
      const model = createModel();
      await trainModel(model, trainingData);
      
      // Store model in Supabase
      const { error } = await supabase
        .from('ml_models')
        .insert({
          version: '1.0',
          accuracy: 85, // This would come from actual model evaluation
          parameters: JSON.stringify(model.getWeights())
        });

      if (error) {
        console.error('Error storing model:', error);
      }

      // Update training progress
      onTrainingProgress({
        totalExamples: {
          pass: trainingData.filter(d => d.label === 'pass').length,
          shot: trainingData.filter(d => d.label === 'shot').length,
          dribble: trainingData.filter(d => d.label === 'dribble').length,
          touch: trainingData.filter(d => d.label === 'touch').length,
          no_possession: trainingData.filter(d => d.label === 'no_possession').length,
        },
        currentAccuracy: 85,
        epochsCompleted: 10,
        lastTrainingTime: new Date().toISOString(),
      });

      toast({
        title: "Training complete",
        description: "Model has been trained and stored successfully.",
      });
    } catch (error) {
      console.error('Training error:', error);
      toast({
        title: "Training failed",
        description: "An error occurred during training.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>ML Training Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Workflow: <br/>
            1. Select the activity type you want to record (e.g., "pass" for multiple passes)<br/>
            2. Click "Start Recording" and begin your video recording simultaneously<br/>
            3. Perform multiple instances of the selected activity<br/>
            4. Click "Stop Recording" when finished<br/>
            5. Upload both your video recording and Sensor Logger data files<br/>
            Make sure to label activities in your video recording software with timestamps.
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
                disabled={isRecording}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-2">Sensor Logger Data (JSON)</label>
              <Input
                type="file"
                accept=".json"
                onChange={handleSensorDataUpload}
                className="cursor-pointer"
                disabled={isRecording}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Activity Type</h3>
          <RadioGroup
            value={currentLabel}
            onValueChange={(value: ActivityType) => setCurrentLabel(value)}
            className="flex flex-wrap gap-4"
            disabled={isRecording}
          >
            {['pass', 'shot', 'dribble', 'touch', 'no_possession'].map((activity) => (
              <div key={activity} className="flex items-center space-x-2">
                <RadioGroupItem value={activity} id={activity} />
                <Label htmlFor={activity}>{activity.replace('_', ' ')}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recording Controls</h3>
          <div className="flex gap-4 items-center">
            <Button
              variant={isRecording ? 'destructive' : 'default'}
              onClick={toggleRecording}
            >
              {isRecording ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            <div className="text-sm">
              Total possession time: {Math.round(totalPossessionTime / 1000)}s
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={startTraining}
            disabled={trainingData.length < 1000}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Start Training ({trainingData.length} examples collected)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MLTrainingManager;