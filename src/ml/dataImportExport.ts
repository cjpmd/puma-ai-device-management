
import { supabase } from '@/integrations/supabase/client';
import { TrainingExample, ActivityType } from './activityRecognition';
import { MLTrainingSession, SessionData } from './types';

// Function to export training data to a JSON file
export const exportTrainingData = async (sessionIds: string[]): Promise<Blob> => {
  // Fetch all selected sessions
  const { data, error } = await supabase
    .from('ml_training_sessions')
    .select('*')
    .in('id', sessionIds);
    
  if (error) {
    console.error('Error fetching training sessions:', error);
    throw new Error('Failed to export training data');
  }
  
  // Convert to a downloadable format
  const exportData = {
    sessions: data,
    exported_at: new Date().toISOString(),
    version: '1.0'
  };
  
  // Convert to JSON blob
  const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  });
  
  return jsonBlob;
};

// Function to import training data from a JSON file
export const importTrainingData = async (file: File): Promise<string[]> => {
  try {
    // Read the file
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data || !data.sessions || !Array.isArray(data.sessions)) {
      throw new Error('Invalid training data format');
    }
    
    // Insert each session
    const sessionIds: string[] = [];
    
    for (const session of data.sessions) {
      // Handle any data format conversions if needed
      // For example, make sure timestamps are in the right format
      
      // Insert the session
      const { data: insertedSession, error } = await supabase
        .from('ml_training_sessions')
        .insert({
          activity_type: session.activity_type,
          device_id: session.device_id,
          player_id: session.player_id,
          start_time: session.start_time,
          end_time: session.end_time,
          duration: session.duration,
          video_timestamp: session.video_timestamp,
          parameters: session.parameters // Include parameters
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error importing session:', error);
        continue;
      }
      
      sessionIds.push(insertedSession.id);
    }
    
    return sessionIds;
  } catch (error) {
    console.error('Error importing training data:', error);
    throw error;
  }
};

// Function to convert SessionData to TrainingExample[]
export const sessionsToExamples = async (sessions: SessionData[]): Promise<TrainingExample[]> => {
  const examples: TrainingExample[] = [];
  
  for (const session of sessions) {
    if (!session.parameters) {
      console.warn(`Session ${session.id} has no parameters data`);
      continue;
    }
    
    try {
      const sessionExamples = JSON.parse(session.parameters) as TrainingExample[];
      
      if (Array.isArray(sessionExamples)) {
        examples.push(...sessionExamples.map(ex => ({
          ...ex,
          // Ensure the label is a valid ActivityType
          label: (ex.label as ActivityType) || 'no_possession'
        })));
      }
    } catch (error) {
      console.error(`Error parsing examples from session ${session.id}:`, error);
    }
  }
  
  return examples;
};

// Function to clean up old training data
export const cleanupOldTrainingSessions = async (olderThanDays: number = 30): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const { data, error } = await supabase
    .from('ml_training_sessions')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');
  
  if (error) {
    console.error('Error cleaning up old sessions:', error);
    return 0;
  }
  
  return data?.length || 0;
};

// Function to aggregate training data by activity type
export const aggregateTrainingData = (examples: TrainingExample[]): Record<ActivityType, number> => {
  const result = {
    'pass': 0,
    'shot': 0,
    'dribble': 0,
    'touch': 0,
    'no_possession': 0
  };
  
  examples.forEach(ex => {
    if (ex.label in result) {
      result[ex.label]++;
    }
  });
  
  return result;
};
