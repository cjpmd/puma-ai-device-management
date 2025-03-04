
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataUploadTab from "./MLTraining/DataUploadTab";
import AnnotationTab from "./MLTraining/AnnotationTab";
import TrainingTab from "./MLTraining/TrainingTab";
import { MLTrainingProvider, TrainingStats, useMLTraining } from "./MLTraining/MLTrainingContext";
import { useRecordingService } from "./MLTraining/RecordingService";
import { useDataProcessingService } from "./MLTraining/DataProcessingService";
import { SensorData, validateSensorLoggerData } from "@/ml/activityRecognition";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

interface MLTrainingManagerProps {
  onTrainingProgress: (stats: TrainingStats) => void;
}

// Main component that uses the context
const MLTrainingContent = () => {
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>ML Training Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="upload" className="w-full">
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
      </CardContent>
    </Card>
  );
};

// Wrapper component that provides the context
const MLTrainingManager = ({ onTrainingProgress }: MLTrainingManagerProps) => {
  return (
    <MLTrainingProvider onTrainingProgress={onTrainingProgress}>
      <MLTrainingContent />
    </MLTrainingProvider>
  );
};

export default MLTrainingManager;
