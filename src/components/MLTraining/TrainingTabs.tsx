import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataUploadTab from "./DataUploadTab";
import AnnotationTab from "./AnnotationTab";
import TrainingTab from "./TrainingTab";
import { useMLTraining } from "./MLTrainingContext";
import { useRecordingService } from "./RecordingService";
import { useDataProcessingService } from "./DataProcessingService";
import { useSession } from "./SessionContext";
import { useFileUploads } from "./hooks/useFileUploads";

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
    setAnnotations
  } = useMLTraining();
  
  const { toggleRecording } = useRecordingService();
  const { processAnnotationsWithSensorData } = useDataProcessingService();
  const { activeTab, setActiveTab } = useSession();
  const { handleVideoUpload, handleSensorDataUpload } = useFileUploads();
  
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
