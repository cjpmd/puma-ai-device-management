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
  convertSensorLoggerData
} from '@/ml/activityRecognition';
import { Upload, Play, Pause, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const MLTrainingManager = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<ActivityType>('pass');
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [possessionStartTime, setPossessionStartTime] = useState<number | null>(null);
  const [totalPossessionTime, setTotalPossessionTime] = useState(0);
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

  const handleSensorDataUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (validateSensorLoggerData(data)) {
            const convertedData = convertSensorLoggerData(data);
            setTrainingData(prev => [...prev, {
              sensorData: convertedData,
              label: currentLabel,
              videoTimestamp: recordingStartTime || Date.now(),
              duration: currentLabel !== 'no_possession' ? Date.now() - (recordingStartTime || Date.now()) : undefined
            }]);
            toast({
              title: "Data added",
              description: "Sensor data has been validated and added to training set.",
            });
          } else {
            toast({
              title: "Error",
              description: "Invalid Sensor Logger data format",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to parse sensor data",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      if (currentLabel !== 'no_possession') {
        setPossessionStartTime(startTime);
      }
      toast({
        title: "Recording started",
        description: "Start your video recording now and perform the selected action. Label timestamps in your video recording software.",
      });
    } else {
      setRecordingStartTime(null);
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
      toast({
        title: "Training complete",
        description: "Model has been trained successfully.",
      });
    } catch (error) {
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
            For accurate training data, start your video recording and click "Start Recording" at the same time.
            Label activities in your video recording software with timestamps. Upload both video and Sensor Logger data files when finished.
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
