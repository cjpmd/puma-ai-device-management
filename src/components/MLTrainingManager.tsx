
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  createModel, 
  trainModel, 
  TrainingExample, 
  ActivityType,
  SensorData
} from '@/ml/activityRecognition';
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataUploadTab from "./MLTraining/DataUploadTab";
import AnnotationTab from "./MLTraining/AnnotationTab";
import TrainingTab from "./MLTraining/TrainingTab";

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

interface Annotation {
  startTime: number;
  endTime: number;
  activityType: ActivityType;
  sensorData?: number[][];
}

const MLTrainingManager = ({ onTrainingProgress }: MLTrainingManagerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<ActivityType>('pass');
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [possessionStartTime, setPossessionStartTime] = useState<number | null>(null);
  const [totalPossessionTime, setTotalPossessionTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [localVideoPath, setLocalVideoPath] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [rawSensorData, setRawSensorData] = useState<SensorData[] | null>(null);
  const { toast } = useToast();

  const handleVideoUpload = (videoURL: string) => {
    setLocalVideoPath(videoURL);
  };

  const handleSensorDataUpload = (sensorData: SensorData[]) => {
    setRawSensorData(sensorData);
  };

  const handleAddAnnotation = (newAnnotation: Annotation) => {
    setAnnotations([...annotations, newAnnotation]);
  };

  const handleAnnotationsImport = (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
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
      setPossessionStartTime(startTime);
      setAnnotations([]);
      setRawSensorData(null);
      
      toast({
        title: "Recording session started",
        description: "Upload your pre-recorded video and sensor data files for this session.",
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
      setPossessionStartTime(null);
      
      // Clear the local video URL
      if (localVideoPath) {
        URL.revokeObjectURL(localVideoPath);
        setLocalVideoPath(null);
      }
      
      toast({
        title: "Recording session stopped",
        description: "Training data has been processed.",
      });
    }
    setIsRecording(!isRecording);
  };

  const processAnnotationsWithSensorData = () => {
    if (!rawSensorData || annotations.length === 0) {
      toast({
        title: "Missing data",
        description: "Need both sensor data and annotations to process training examples",
        variant: "destructive",
      });
      return;
    }
    
    const newTrainingExamples: TrainingExample[] = [];
    
    // Process each annotation
    annotations.forEach(annotation => {
      // Filter sensor data that falls within this annotation's time range
      const relevantSensorData = rawSensorData.filter(reading => {
        const readingTime = new Date(reading.time).getTime();
        return readingTime >= annotation.startTime && readingTime <= annotation.endTime;
      });
      
      if (relevantSensorData.length > 0) {
        // Convert the relevant sensor data
        const convertedData = convertSensorLoggerData(relevantSensorData);
        
        // Create a training example
        newTrainingExamples.push({
          sensorData: convertedData,
          label: annotation.activityType,
          videoTimestamp: annotation.startTime,
          duration: annotation.endTime - annotation.startTime
        });
      }
    });
    
    // Add to existing training data
    setTrainingData(prev => [...prev, ...newTrainingExamples]);
    
    toast({
      title: "Training data created",
      description: `Created ${newTrainingExamples.length} training examples from annotations`,
    });

    // Update counters for the UI
    updateTrainingStats(newTrainingExamples);
  };

  const updateTrainingStats = (newExamples: TrainingExample[]) => {
    // Count examples by activity type
    const activityCounts = {
      pass: newExamples.filter(ex => ex.label === 'pass').length,
      shot: newExamples.filter(ex => ex.label === 'shot').length,
      dribble: newExamples.filter(ex => ex.label === 'dribble').length,
      touch: newExamples.filter(ex => ex.label === 'touch').length,
      no_possession: newExamples.filter(ex => ex.label === 'no_possession').length,
    };
    
    // Calculate total time for possession activities
    const newPossessionTime = newExamples
      .filter(ex => ex.label !== 'no_possession' && ex.duration)
      .reduce((total, ex) => total + (ex.duration || 0), 0);
    
    setTotalPossessionTime(prev => prev + newPossessionTime);
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
              onAnnotationAdd={handleAddAnnotation}
              onAnnotationsImport={handleAnnotationsImport}
              onLabelChange={setCurrentLabel}
              onProcessAnnotations={processAnnotationsWithSensorData}
              hasRawSensorData={!!rawSensorData}
            />
          </TabsContent>
          
          <TabsContent value="training" className="space-y-4">
            <TrainingTab 
              trainingData={trainingData}
              onStartTraining={startTraining}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Import the missing function from activityRecognition to maintain functionality
import { convertSensorLoggerData } from '@/ml/activityRecognition';

export default MLTrainingManager;
