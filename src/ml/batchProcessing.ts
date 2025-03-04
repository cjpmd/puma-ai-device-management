import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';
import { 
  ActivityType, 
  TrainingExample, 
  validateSensorLoggerData, 
  convertSensorLoggerData 
} from './activityRecognition';

interface SessionData {
  id: string;
  activity_type: string;
  video_timestamp?: number;
  player_id?: string;
}

/**
 * Process a batch of sensor data files and convert them to training examples
 */
export const processSensorDataBatch = async (
  sensorDataFiles: File[],
  activityType: ActivityType
): Promise<TrainingExample[]> => {
  const trainingExamples: TrainingExample[] = [];
  
  for (const file of sensorDataFiles) {
    try {
      const examples = await processSingleSensorFile(file, activityType);
      trainingExamples.push(...examples);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    }
  }
  
  return trainingExamples;
};

/**
 * Process a single sensor data file and extract training examples
 */
const processSingleSensorFile = async (
  file: File,
  activityType: ActivityType
): Promise<TrainingExample[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target || !event.target.result) {
          reject(new Error('Error reading file'));
          return;
        }
        
        const jsonData = JSON.parse(event.target.result as string);
        
        if (!validateSensorLoggerData(jsonData)) {
          reject(new Error('Invalid sensor data format'));
          return;
        }
        
        const sensorData = convertSensorLoggerData(jsonData);
        
        const example: TrainingExample = {
          sensorData,
          label: activityType,
          videoTimestamp: Date.now(),
          duration: sensorData.length > 0 
            ? (sensorData[sensorData.length - 1][3] - sensorData[0][3]) * 1000
            : 0
        };
        
        resolve([example]);
      } catch (error) {
        reject(new Error(`Error parsing JSON: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Save a batch of training examples to an existing training session
 */
export const saveTrainingBatch = async (
  examples: TrainingExample[],
  sessionId: string
): Promise<boolean> => {
  try {
    if (examples.length === 0) {
      console.warn('No examples to save');
      return false;
    }
    
    const { data: sessionData, error: sessionError } = await supabase
      .from('ml_training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return false;
    }
    
    const { error } = await supabase
      .from('ml_training_sessions')
      .update({
        parameters: JSON.stringify(examples)
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error saving examples:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving training batch:', error);
    return false;
  }
};

/**
 * Process video frames to extract training examples
 */
export const processVideoFrames = async (
  videoFile: File,
  annotations: { startTime: number; endTime: number; label: ActivityType }[],
  extractionRate = 5
): Promise<TrainingExample[]> => {
  const examples: TrainingExample[] = [];
  
  for (const annotation of annotations) {
    const { startTime, endTime, label } = annotation;
    const duration = endTime - startTime;
    
    const sensorData: number[][] = [];
    const numFrames = Math.floor(duration / 1000 * 30 / extractionRate);
    
    for (let i = 0; i < numFrames; i++) {
      sensorData.push([
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        startTime / 1000 + (i * extractionRate / 30)
      ]);
    }
    
    examples.push({
      sensorData,
      label,
      videoTimestamp: startTime,
      duration
    });
  }
  
  return examples;
};

/**
 * Link training sessions with video analysis
 */
export const linkSessionsWithVideo = async (
  sessionIds: string[],
  videoAnalysisId: string
): Promise<boolean> => {
  try {
    for (const sessionId of sessionIds) {
      const { error } = await supabase
        .from('ml_training_sessions')
        .update({
          parameters: { 
            related_video_id: videoAnalysisId 
          }
        })
        .eq('id', sessionId);
      
      if (error) {
        console.error(`Error linking session ${sessionId} with video:`, error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error linking sessions with video:', error);
    return false;
  }
};

/**
 * Get all training sessions linked to a specific video
 */
export const getSessionsByVideo = async (
  videoAnalysisId: string
): Promise<SessionData[]> => {
  try {
    const { data, error } = await supabase
      .from('ml_training_sessions')
      .select('*')
      .contains('parameters', { related_video_id: videoAnalysisId });
    
    if (error) {
      console.error('Error fetching sessions by video:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting sessions by video:', error);
    return [];
  }
};

/**
 * Extract training examples from all sessions linked to a video
 */
export const extractExamplesFromVideo = async (
  videoAnalysisId: string
): Promise<TrainingExample[]> => {
  try {
    const sessions = await getSessionsByVideo(videoAnalysisId);
    const allExamples: TrainingExample[] = [];
    
    for (const session of sessions) {
      if (session.parameters) {
        try {
          const examples = JSON.parse(session.parameters as string);
          if (Array.isArray(examples)) {
            examples.forEach(example => {
              if (example && 
                  example.sensorData && 
                  example.label && 
                  Array.isArray(example.sensorData)) {
                allExamples.push({
                  sensorData: example.sensorData,
                  label: example.label as ActivityType,
                  videoTimestamp: example.videoTimestamp || 0,
                  duration: example.duration
                });
              }
            });
          }
        } catch (parseError) {
          console.error(`Error parsing examples from session ${session.id}:`, parseError);
        }
      }
    }
    
    return allExamples;
  } catch (error) {
    console.error('Error extracting examples from video:', error);
    return [];
  }
};
