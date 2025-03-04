
import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';
import { ActivityType, TrainingExample } from './activityRecognition';

/**
 * Export training data to a JSON file
 */
export const exportTrainingData = (examples: TrainingExample[]): string => {
  const jsonData = JSON.stringify(examples, null, 2);
  
  // Create a blob with the data
  const blob = new Blob([jsonData], { type: 'application/json' });
  
  // Create a URL for the blob
  return URL.createObjectURL(blob);
};

/**
 * Import training data from a JSON file
 */
export const importTrainingData = async (file: File): Promise<TrainingExample[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target || !event.target.result) {
          reject(new Error('Error reading file'));
          return;
        }
        
        const jsonData = JSON.parse(event.target.result as string);
        
        // Validate the imported data
        if (!Array.isArray(jsonData)) {
          reject(new Error('Invalid format: expected an array'));
          return;
        }
        
        const examples: TrainingExample[] = [];
        
        for (const item of jsonData) {
          if (!item.sensorData || !item.label || !Array.isArray(item.sensorData)) {
            console.warn('Skipping invalid entry:', item);
            continue;
          }
          
          // Ensure label is a valid ActivityType
          const label = item.label as ActivityType;
          if (!['pass', 'shot', 'dribble', 'touch', 'no_possession'].includes(label)) {
            console.warn(`Skipping entry with invalid label: ${label}`);
            continue;
          }
          
          examples.push({
            sensorData: item.sensorData,
            label,
            videoTimestamp: item.videoTimestamp || 0,
            duration: item.duration
          });
        }
        
        resolve(examples);
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
 * Save training examples to Supabase
 */
export const saveTrainingExamples = async (
  examples: TrainingExample[],
  sessionId: string
): Promise<boolean> => {
  try {
    // Instead of creating a new table, we'll update the ml_training_sessions table
    // with a JSON field containing the training examples
    const { error } = await supabase
      .from('ml_training_sessions')
      .update({
        // Use parameters JSON field to store the training examples
        parameters: JSON.stringify(examples)
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error saving training examples:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving training examples:', error);
    return false;
  }
};

/**
 * Load training examples from Supabase
 */
export const loadTrainingExamples = async (sessionId?: string): Promise<TrainingExample[]> => {
  try {
    let query = supabase
      .from('ml_training_sessions')
      .select('*');
    
    if (sessionId) {
      query = query.eq('id', sessionId);
    } else {
      // If no session ID provided, limit to recent sessions
      query = query.order('created_at', { ascending: false }).limit(10);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading training examples:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Combine examples from all sessions
    const allExamples: TrainingExample[] = [];
    
    for (const session of data) {
      if (session.parameters) {
        try {
          // Parse the parameters field which contains our examples
          const sessionExamples = JSON.parse(session.parameters as string);
          
          if (Array.isArray(sessionExamples)) {
            // Validate and convert to TrainingExample type
            for (const example of sessionExamples) {
              if (
                example &&
                example.sensorData &&
                example.label &&
                Array.isArray(example.sensorData)
              ) {
                allExamples.push({
                  sensorData: example.sensorData,
                  label: example.label as ActivityType,
                  videoTimestamp: example.videoTimestamp || 0,
                  duration: example.duration
                });
              }
            }
          }
        } catch (parseError) {
          console.error(`Error parsing examples from session ${session.id}:`, parseError);
        }
      }
    }
    
    return allExamples;
  } catch (error) {
    console.error('Error loading training examples:', error);
    return [];
  }
};

/**
 * Group training examples by activity type
 */
export const groupExamplesByActivity = (
  examples: TrainingExample[]
): Record<ActivityType, TrainingExample[]> => {
  const groups: Record<ActivityType, TrainingExample[]> = {
    pass: [],
    shot: [],
    dribble: [],
    touch: [],
    no_possession: []
  };
  
  for (const example of examples) {
    groups[example.label].push(example);
  }
  
  return groups;
};

/**
 * Count examples by activity type
 */
export const countExamplesByActivity = (
  examples: TrainingExample[]
): Record<ActivityType, number> => {
  const counts: Record<ActivityType, number> = {
    pass: 0,
    shot: 0,
    dribble: 0,
    touch: 0,
    no_possession: 0
  };
  
  for (const example of examples) {
    counts[example.label]++;
  }
  
  return counts;
};

/**
 * Calculate total duration of training examples
 */
export const calculateTotalDuration = (examples: TrainingExample[]): number => {
  return examples.reduce((total, example) => total + (example.duration || 0), 0);
};
