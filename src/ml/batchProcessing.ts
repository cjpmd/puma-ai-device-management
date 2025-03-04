// Modified imports to include new type definitions
import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';
import { ActivityType, TrainingExample, validateSensorLoggerData, convertSensorLoggerData } from './activityRecognition';
import { MLTrainingSession, SessionData } from './types';

/**
 * Process a batch of raw sensor data files
 */
export const processSensorDataBatch = async (
  files: File[],
  labelCallback: (data: any) => ActivityType
): Promise<TrainingExample[]> => {
  const examples: TrainingExample[] = [];
  
  for (const file of files) {
    try {
      // Read the file as text
      const text = await file.text();
      
      // Parse the JSON data
      const data = JSON.parse(text);
      
      // Validate the data format
      if (!validateSensorLoggerData(data)) {
        console.error(`Invalid data format in file: ${file.name}`);
        continue;
      }
      
      // Convert the data to a format suitable for ML
      const processedData = convertSensorLoggerData(data);
      
      // Get the activity type label
      const label = labelCallback(data);
      
      // Create a training example
      examples.push({
        sensorData: processedData,
        label,
        videoTimestamp: Date.now(), // Using current timestamp as default
        duration: processedData.length > 0 ? 
          Math.max(...processedData.map(d => d[3])) - Math.min(...processedData.map(d => d[3])) : 
          0
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    }
  }
  
  return examples;
};

/**
 * Create training session for a batch of sensor data
 */
export const createTrainingSession = async (
  examples: TrainingExample[],
  activityType: ActivityType,
  deviceId?: number,
  playerId?: string
): Promise<string | null> => {
  try {
    // Insert new training session
    const { data, error } = await supabase
      .from('ml_training_sessions')
      .insert({
        activity_type: activityType,
        device_id: deviceId,
        player_id: playerId,
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration: examples.reduce((sum, ex) => sum + (ex.duration || 0), 0),
        parameters: JSON.stringify(examples)
      } as MLTrainingSession)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating training session:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error creating training session:', error);
    return null;
  }
};

/**
 * Process a batch of training sessions
 */
export const processTrainingSessions = async (
  sessionIds: string[]
): Promise<TrainingExample[]> => {
  const examples: TrainingExample[] = [];
  
  for (const sessionId of sessionIds) {
    try {
      // Get the session data
      const { data, error } = await supabase
        .from('ml_training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error || !data) {
        console.error(`Error loading session ${sessionId}:`, error);
        continue;
      }
      
      // Cast data to SessionData type
      const session = data as SessionData;
      
      // Check if the session has pre-processed examples
      if (session.parameters) {
        try {
          const sessionExamples = JSON.parse(session.parameters);
          
          if (Array.isArray(sessionExamples)) {
            // Add the examples to the list
            examples.push(...sessionExamples.map((ex: any) => ({
              sensorData: ex.sensorData,
              label: ex.label as ActivityType,
              videoTimestamp: ex.videoTimestamp || 0,
              duration: ex.duration || 0
            })));
          }
        } catch (parseError) {
          console.error(`Error parsing examples from session ${sessionId}:`, parseError);
        }
      } else {
        // Process raw data if available
        // This is a placeholder for any additional processing logic
        console.log(`Session ${sessionId} has no pre-processed examples`);
      }
    } catch (error) {
      console.error(`Error processing session ${sessionId}:`, error);
    }
  }
  
  return examples;
};

/**
 * Update a training session with processed examples
 */
export const updateTrainingSession = async (
  sessionId: string,
  examples: TrainingExample[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ml_training_sessions')
      .update({
        parameters: JSON.stringify(examples)
      } as MLTrainingSession)
      .eq('id', sessionId);
    
    if (error) {
      console.error(`Error updating session ${sessionId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating session ${sessionId}:`, error);
    return false;
  }
};

/**
 * Delete a training session
 */
export const deleteTrainingSession = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ml_training_sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) {
      console.error(`Error deleting session ${sessionId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    return false;
  }
};

/**
 * Get all training sessions
 */
export const getAllTrainingSessions = async (): Promise<SessionData[]> => {
  try {
    const { data, error } = await supabase
      .from('ml_training_sessions')
      .select('*');
    
    if (error) {
      console.error('Error fetching training sessions:', error);
      return [];
    }
    
    return data as SessionData[];
  } catch (error) {
    console.error('Error fetching training sessions:', error);
    return [];
  }
};

/**
 * Get training session by ID
 */
export const getTrainingSessionById = async (sessionId: string): Promise<SessionData | null> => {
  try {
    const { data, error } = await supabase
      .from('ml_training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      console.error(`Error fetching session ${sessionId}:`, error);
      return null;
    }
    
    return data as SessionData;
  } catch (error) {
    console.error(`Error fetching session ${sessionId}:`, error);
    return null;
  }
};
