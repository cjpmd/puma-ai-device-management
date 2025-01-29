import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { createModel, trainModel, TrainingExample } from '@/ml/activityRecognition';
import { Upload, Play, Pause } from 'lucide-react';

const MLTrainingManager = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<'shot' | 'pass'>('shot');
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const { toast } = useToast();

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "Video uploaded",
        description: "Video file has been uploaded successfully.",
      });
      // Here you would process the video file
      // This would typically involve sending it to a server
    }
  };

  const handleSensorDataUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          // Validate data format
          if (data.accelerometer && data.gyroscope && data.impactForce) {
            setTrainingData(prev => [...prev, {
              sensorData: data,
              label: currentLabel,
              videoTimestamp: Date.now()
            }]);
            toast({
              title: "Data added",
              description: "Sensor data has been added to training set.",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Invalid sensor data format",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
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

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    toast({
      title: isRecording ? "Recording stopped" : "Recording started",
      description: `Currently recording ${currentLabel} actions.`,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>ML Training Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-2">Sensor Data (JSON)</label>
              <Input
                type="file"
                accept=".json"
                onChange={handleSensorDataUpload}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Live Recording</h3>
          <div className="flex gap-4 items-center">
            <Button
              variant={currentLabel === 'shot' ? 'default' : 'outline'}
              onClick={() => setCurrentLabel('shot')}
            >
              Shot
            </Button>
            <Button
              variant={currentLabel === 'pass' ? 'default' : 'outline'}
              onClick={() => setCurrentLabel('pass')}
            >
              Pass
            </Button>
            <Button
              variant={isRecording ? 'destructive' : 'default'}
              onClick={toggleRecording}
            >
              {isRecording ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
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