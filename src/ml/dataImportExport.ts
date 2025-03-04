
import { TrainingExample, SensorData } from './activityRecognition';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingDataExport {
  version: string;
  date: string;
  examples: TrainingExample[];
  metadata: {
    numExamples: number;
    classCounts: Record<string, number>;
    sourceDevice?: string;
  };
}

/**
 * Export training data to a JSON file
 */
export const exportTrainingData = (
  trainingData: TrainingExample[],
  sourceDevice?: string
): string => {
  // Calculate class counts
  const classCounts: Record<string, number> = {};
  trainingData.forEach(example => {
    if (!classCounts[example.label]) {
      classCounts[example.label] = 0;
    }
    classCounts[example.label]++;
  });
  
  // Create export object
  const exportData: TrainingDataExport = {
    version: '1.0',
    date: new Date().toISOString(),
    examples: trainingData,
    metadata: {
      numExamples: trainingData.length,
      classCounts,
      sourceDevice
    }
  };
  
  // Convert to JSON string
  return JSON.stringify(exportData, null, 2);
};

/**
 * Create a downloadable file from training data
 */
export const downloadTrainingData = (
  trainingData: TrainingExample[],
  fileName: string = 'training_data.json'
): void => {
  const jsonData = exportTrainingData(trainingData);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Import training data from a JSON string
 */
export const importTrainingData = (
  jsonData: string
): TrainingExample[] | null => {
  try {
    const data = JSON.parse(jsonData) as TrainingDataExport;
    
    // Validate data format
    if (!data.examples || !Array.isArray(data.examples)) {
      console.error('Invalid training data format: missing examples array');
      return null;
    }
    
    // Check if each example has the required fields
    const validExamples = data.examples.filter(example => {
      return (
        example.sensorData &&
        Array.isArray(example.sensorData) &&
        example.label &&
        example.videoTimestamp !== undefined
      );
    });
    
    if (validExamples.length !== data.examples.length) {
      console.warn(`Filtered out ${data.examples.length - validExamples.length} invalid examples`);
    }
    
    return validExamples;
  } catch (error) {
    console.error('Error parsing training data:', error);
    return null;
  }
};

/**
 * Load training data from a file
 */
export const loadTrainingDataFromFile = (
  file: File
): Promise<TrainingExample[] | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = importTrainingData(content);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
};

/**
 * Save training examples to Supabase
 */
export const saveTrainingExamplesToSupabase = async (
  sessionId: string,
  examples: TrainingExample[]
): Promise<boolean> => {
  try {
    // Convert examples to database format
    const dbExamples = examples.map((example, index) => ({
      training_session_id: sessionId,
      label: example.label,
      sensor_data: example.sensorData,
      video_timestamp: example.videoTimestamp,
      duration: example.duration || 0,
      example_index: index
    }));
    
    // Store the examples directly in ml_training_sessions
    // Since there's no training_examples table, we need to store the data differently
    const { error } = await supabase
      .from('ml_training_sessions')
      .update({
        training_data: JSON.stringify(dbExamples)
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error saving examples:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving examples:', error);
    return false;
  }
};

/**
 * Load training examples from Supabase
 */
export const loadTrainingExamplesFromSupabase = async (
  sessionId?: string
): Promise<TrainingExample[]> => {
  try {
    let query = supabase
      .from('ml_training_sessions')
      .select('id, training_data');
    
    if (sessionId) {
      query = query.eq('id', sessionId);
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
      console.error('Error loading examples:', error);
      return [];
    }
    
    // Collect all training examples from the sessions
    const allExamples: TrainingExample[] = [];
    
    data.forEach(session => {
      if (session.training_data) {
        try {
          const sessionExamples = JSON.parse(session.training_data);
          if (Array.isArray(sessionExamples)) {
            sessionExamples.forEach(example => {
              if (example.sensor_data && example.label) {
                allExamples.push({
                  sensorData: example.sensor_data,
                  label: example.label,
                  videoTimestamp: example.video_timestamp,
                  duration: example.duration
                });
              }
            });
          }
        } catch (e) {
          console.error('Error parsing training data for session:', session.id, e);
        }
      }
    });
    
    return allExamples;
  } catch (error) {
    console.error('Error loading examples:', error);
    return [];
  }
};

/**
 * Get a list of all training sessions
 */
export const getTrainingSessions = async (): Promise<{
  id: string;
  activityType: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  exampleCount: number;
}[]> => {
  try {
    const { data: sessions, error } = await supabase
      .from('ml_training_sessions')
      .select('*')
      .order('start_time', { ascending: false });
    
    if (error || !sessions) {
      console.error('Error loading sessions:', error);
      return [];
    }
    
    return sessions.map(s => {
      let exampleCount = 0;
      
      // Count examples if training_data is available
      if (s.training_data) {
        try {
          const trainingData = JSON.parse(s.training_data);
          exampleCount = Array.isArray(trainingData) ? trainingData.length : 0;
        } catch (e) {
          console.error('Error parsing training data for session count:', s.id, e);
        }
      }
      
      return {
        id: s.id,
        activityType: s.activity_type,
        startTime: s.start_time,
        endTime: s.end_time,
        duration: s.duration,
        exampleCount
      };
    });
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};
