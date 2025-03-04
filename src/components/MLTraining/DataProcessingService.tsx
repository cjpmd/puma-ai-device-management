
import { useToast } from "@/components/ui/use-toast";
import { convertSensorLoggerData, SensorData, TrainingExample } from '@/ml/activityRecognition';
import { supabase } from "@/integrations/supabase/client";
import { useMLTraining } from "./MLTrainingContext";

export const useDataProcessingService = () => {
  const { 
    rawSensorData, 
    annotations, 
    trainingData, 
    setTrainingData, 
    currentSessionId,
    setTotalPossessionTime
  } = useMLTraining();
  const { toast } = useToast();

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
        const convertedData = convertSensorLoggerData(relevantSensorData as SensorData[]);
        
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
    setTrainingData([...trainingData, ...newTrainingExamples]);
    
    toast({
      title: "Training data created",
      description: `Created ${newTrainingExamples.length} training examples from annotations`,
    });

    // Update counters for the UI
    updateTrainingStats(newTrainingExamples);
  };

  const updateTrainingStats = (newExamples: TrainingExample[]) => {
    // Calculate total time for possession activities
    const newPossessionTime = newExamples
      .filter(ex => ex.label !== 'no_possession' && ex.duration)
      .reduce((total, ex) => total + (ex.duration || 0), 0);
    
    // Fix: Instead of using a function to update the state, we'll calculate the new value first
    // and then pass the new value directly to setTotalPossessionTime
    setTotalPossessionTime(newPossessionTime);
    
    // If we have a session ID, update the session with the new data in Supabase
    if (currentSessionId) {
      const sessionUpdate = async () => {
        const { error } = await supabase
          .from('ml_training_sessions')
          .update({ 
            parameters: JSON.stringify({
              annotationCount: annotations.length,
              exampleCount: newExamples.length,
              activityCounts: {
                pass: newExamples.filter(ex => ex.label === 'pass').length,
                shot: newExamples.filter(ex => ex.label === 'shot').length,
                dribble: newExamples.filter(ex => ex.label === 'dribble').length,
                touch: newExamples.filter(ex => ex.label === 'touch').length,
                no_possession: newExamples.filter(ex => ex.label === 'no_possession').length,
              }
            })
          })
          .eq('id', currentSessionId);
          
        if (error) {
          console.error('Error updating session parameters:', error);
        }
      };
      
      sessionUpdate();
    }
  };

  return { processAnnotationsWithSensorData };
};
