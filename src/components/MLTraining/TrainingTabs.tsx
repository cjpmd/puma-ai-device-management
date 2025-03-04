
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataUploadTab from "./DataUploadTab";
import AnnotationTab from "./AnnotationTab";
import TrainingTab from "./TrainingTab";
import { useMLTraining } from "./MLTrainingContext";
import { useRecordingService } from "./RecordingService";
import { useDataProcessingService } from "./DataProcessingService";
import { useSession } from "./SessionContext";
import { useToast } from "@/components/ui/use-toast";

export const TrainingTabs = () => {
  const { 
    isRecording,
    currentLabel,
    trainingData,
    totalPossessionTime,
    currentSessionId,
    localVideoPath,
    annotations,
    rawSensorData,
    setCurrentLabel,
    setLocalVideoPath,
    setAnnotations,
    setRawSensorData
  } = useMLTraining();
  
  const { toggleRecording } = useRecordingService();
  const { processAnnotationsWithSensorData } = useDataProcessingService();
  const { toast } = useToast();
  const { activeTab, setActiveTab } = useSession();
  
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upload">Data Upload</TabsTrigger>
        <TabsTrigger value="annotation">Annotations</TabsTrigger>
        <TabsTrigger value="training">Training</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="space-y-4">
        <DataUploadTab 
          isRecording={isRecording}
          totalPossessionTime={totalPossessionTime}
          currentSessionId={currentSessionId}
          onVideoUpload={handleVideoUpload}
          onSensorDataUpload={handleSensorDataUpload}
          onToggleRecording={toggleRecording}
        />
      </TabsContent>
      
      <TabsContent value="annotation" className="space-y-4">
        <AnnotationTab 
          localVideoPath={localVideoPath}
          annotations={annotations}
          currentLabel={currentLabel}
          onAnnotationAdd={(annotation) => setAnnotations([...annotations, annotation])}
          onAnnotationsImport={setAnnotations}
          onLabelChange={setCurrentLabel}
          onProcessAnnotations={processAnnotationsWithSensorData}
          hasRawSensorData={!!rawSensorData}
        />
      </TabsContent>
      
      <TabsContent value="training" className="space-y-4">
        <TrainingTab 
          trainingData={trainingData}
          onStartTraining={() => console.log("Training started")}
        />
      </TabsContent>
    </Tabs>
  );
};

// Make sure to import SensorData type
import { SensorData, validateSensorLoggerData } from '@/ml/activityRecognition';
