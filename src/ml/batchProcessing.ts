
import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';
import { 
  ActivityType, 
  TrainingExample, 
  convertSensorLoggerData,
  SensorData
} from './activityRecognition';
import { saveTrainingExamples } from './dataImportExport';

interface ProcessingOptions {
  windowSize?: number; // in milliseconds
  overlapPercentage?: number;
  minimumWindowsRequired?: number;
}

/**
 * Process raw sensor data to create training examples
 */
export const processSensorData = (
  sensorData: SensorData[],
  annotations: Array<{
    startTime: number;
    endTime: number;
    activityType: ActivityType;
  }>,
  options: ProcessingOptions = {}
): TrainingExample[] => {
  const {
    windowSize = 500, // 500ms default window
    overlapPercentage = 50, // 50% overlap
    minimumWindowsRequired = 1
  } = options;
  
  const trainingExamples: TrainingExample[] = [];
  
  // Sort sensor data by timestamp
  const sortedData = [...sensorData].sort((a, b) => {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    return timeA - timeB;
  });
  
  if (sortedData.length === 0) {
    console.log('No sensor data to process');
    return [];
  }
  
  // Process each annotation
  for (const annotation of annotations) {
    const { startTime, endTime, activityType } = annotation;
    
    // Filter sensor data within this annotation's time range
    const dataInRange = sortedData.filter(reading => {
      const readingTime = new Date(reading.time).getTime();
      return readingTime >= startTime && readingTime <= endTime;
    });
    
    if (dataInRange.length === 0) {
      console.log(`No data in range for annotation ${activityType} (${startTime}-${endTime})`);
      continue;
    }
    
    // Calculate sliding windows
    const duration = endTime - startTime;
    const stepSize = windowSize * (1 - overlapPercentage / 100);
    const numWindows = Math.floor((duration - windowSize) / stepSize) + 1;
    
    if (numWindows < minimumWindowsRequired) {
      console.log(`Not enough data for minimum windows in annotation ${activityType} (${startTime}-${endTime})`);
      continue;
    }
    
    // Create windows
    for (let i = 0; i < numWindows; i++) {
      const windowStart = startTime + i * stepSize;
      const windowEnd = windowStart + windowSize;
      
      const windowData = dataInRange.filter(reading => {
        const readingTime = new Date(reading.time).getTime();
        return readingTime >= windowStart && readingTime <= windowEnd;
      });
      
      if (windowData.length > 0) {
        // Convert to feature format
        const convertedData = convertSensorLoggerData(windowData);
        
        trainingExamples.push({
          sensorData: convertedData,
          label: activityType,
          videoTimestamp: windowStart,
          duration: windowSize
        });
      }
    }
  }
  
  return trainingExamples;
};

/**
 * Process video annotations to create training examples
 * This is for when we have video annotations but not direct sensor data
 */
export const processVideoAnnotations = async (
  videoId: string,
  annotations: Array<{
    startTime: number;
    endTime: number;
    activityType: ActivityType;
  }>
): Promise<TrainingExample[]> => {
  try {
    // First create a training session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('ml_training_sessions')
      .insert({
        activity_type: 'multiple',
        start_time: new Date().toISOString(),
        video_timestamp: annotations[0]?.startTime || Date.now()
      })
      .select()
      .single();

    if (sessionError || !sessionData) {
      console.error('Error creating training session:', sessionError);
      return [];
    }

    const sessionId = sessionData.id;
    
    // Get sensor data that corresponds to this video
    // We assume sensor data is stored in sensor_recordings table with a link to the video
    const { data: sensorData, error: sensorError } = await supabase
      .from('sensor_recordings')
      .select('*')
      .eq('video_id', videoId);
    
    if (sensorError) {
      console.error('Error fetching sensor data:', sensorError);
      return [];
    }
    
    if (!sensorData || sensorData.length === 0) {
      console.log('No sensor data found for this video');
      return [];
    }
    
    // Convert the DB format to our SensorData format
    const formattedSensorData: SensorData[] = sensorData.map(record => ({
      x: record.x.toString(),
      y: record.y.toString(),
      z: record.z.toString(),
      time: new Date(record.timestamp).toISOString(),
      seconds_elapsed: ((record.timestamp - sensorData[0].timestamp) / 1000).toString(),
      sensor: record.sensor_type
    }));
    
    // Process the sensor data to create training examples
    const examples = processSensorData(formattedSensorData, annotations);
    
    // Save the examples to the database
    if (examples.length > 0) {
      await saveTrainingExamples(examples, sessionId);
    }
    
    return examples;
  } catch (error) {
    console.error('Error processing video annotations:', error);
    return [];
  }
};

/**
 * Batch process multiple ML training sessions
 */
export const batchProcessSessions = async (
  sessionIds: string[]
): Promise<TrainingExample[]> => {
  try {
    const allExamples: TrainingExample[] = [];
    
    for (const sessionId of sessionIds) {
      // Get session data
      const { data: session, error: sessionError } = await supabase
        .from('ml_training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError || !session) {
        console.error(`Error fetching session ${sessionId}:`, sessionError);
        continue;
      }
      
      // Get sensor data for this session
      const { data: sensorData, error: sensorError } = await supabase
        .from('sensor_recordings')
        .select('*')
        .eq('training_session_id', sessionId);
      
      if (sensorError) {
        console.error(`Error fetching sensor data for session ${sessionId}:`, sensorError);
        continue;
      }
      
      if (!sensorData || sensorData.length === 0) {
        console.log(`No sensor data found for session ${sessionId}`);
        continue;
      }
      
      // Get annotations for this session
      // Assuming annotations are stored in video_annotations table
      const { data: annotations, error: annotationsError } = await supabase
        .from('video_annotations')
        .select('*')
        .eq('video_id', session.video_id);
      
      if (annotationsError) {
        console.error(`Error fetching annotations for session ${sessionId}:`, annotationsError);
        continue;
      }
      
      if (!annotations || annotations.length === 0) {
        console.log(`No annotations found for session ${sessionId}`);
        continue;
      }
      
      // Format the annotations
      const formattedAnnotations = annotations.map(annotation => {
        // Parse the annotation data which should contain start/end times and activity type
        const data = typeof annotation.data === 'string' 
                   ? JSON.parse(annotation.data) 
                   : annotation.data;
        
        return {
          startTime: data.startTime || annotation.timestamp,
          endTime: data.endTime || (annotation.timestamp + (data.duration || 1000)),
          activityType: data.activityType as ActivityType
        };
      });
      
      // Format sensor data
      const formattedSensorData = sensorData.map(record => ({
        x: record.x.toString(),
        y: record.y.toString(),
        z: record.z.toString(),
        time: new Date(record.timestamp).toISOString(),
        seconds_elapsed: ((record.timestamp - sensorData[0].timestamp) / 1000).toString(),
        sensor: record.sensor_type
      }));
      
      // Process data to create examples
      const sessionExamples = processSensorData(
        formattedSensorData,
        formattedAnnotations
      );
      
      allExamples.push(...sessionExamples);
    }
    
    return allExamples;
  } catch (error) {
    console.error('Error in batch processing:', error);
    return [];
  }
};

/**
 * Calculate class weights for imbalanced datasets
 */
export const calculateClassWeights = (
  examples: TrainingExample[]
): Record<ActivityType, number> => {
  const activityCounts: Record<ActivityType, number> = {
    pass: 0,
    shot: 0,
    dribble: 0,
    touch: 0,
    no_possession: 0
  };
  
  // Count examples per class
  for (const example of examples) {
    activityCounts[example.label]++;
  }
  
  // Find the maximum count
  const maxCount = Math.max(...Object.values(activityCounts));
  
  // Calculate weights (inverse of frequency, normalized)
  const weights: Record<ActivityType, number> = {} as Record<ActivityType, number>;
  
  for (const activity of Object.keys(activityCounts) as ActivityType[]) {
    const count = activityCounts[activity];
    weights[activity] = count > 0 ? maxCount / count : 1.0;
  }
  
  return weights;
};
