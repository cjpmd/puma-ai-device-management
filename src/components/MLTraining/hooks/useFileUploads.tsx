
import { useToast } from "@/components/ui/use-toast";
import { useMLTraining } from "../MLTrainingContext";
import { validateSensorLoggerData, SensorData } from '@/ml/activityRecognition';

export const useFileUploads = () => {
  const { 
    currentSessionId,
    setLocalVideoPath,
    setRawSensorData
  } = useMLTraining();
  
  const { toast } = useToast();

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a local URL for the video file
      const videoURL = URL.createObjectURL(file);
      setLocalVideoPath(videoURL);
      
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
            setRawSensorData(rawData);
            
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

  return {
    handleVideoUpload,
    handleSensorDataUpload
  };
};
