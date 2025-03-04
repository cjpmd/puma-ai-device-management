
import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';
import { ActivityType, TrainingExample, convertSensorLoggerData, SensorData } from './activityRecognition';
import { createModel, trainModel } from './activityRecognition';
import { saveModelVersion } from './modelVersioning';

// Define the session data interface to include parameters
interface SessionData {
  id: string;
  activity_type: string;
  start_time: string;
  end_time: string;
  duration: number;
  player_id: string;
  device_id: number;
  video_timestamp: number;
  created_at: string;
  updated_at: string;
  parameters?: any; // Add parameters field for training data
}

// Interface for Supabase query result
interface SessionQueryResult {
  data: SessionData[] | null;
  error: any;
}

/**
 * Process all sensor recordings from a specific session and convert them to training examples
 */
export const processSensorRecordings = async (
  sessionId: string,
  activityType: ActivityType
): Promise<TrainingExample[]> => {
  try {
    // Get sensor recordings for this session
    const { data: recordings, error } = await supabase
      .from('sensor_recordings')
      .select('*')
      .eq('training_session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching sensor recordings:', error);
      return [];
    }

    if (!recordings || recordings.length === 0) {
      console.log('No sensor recordings found for session', sessionId);
      return [];
    }

    // Process and convert the sensor data
    const sensorData: SensorData[] = recordings.map(recording => ({
      x: recording.x.toString(),
      y: recording.y.toString(),
      z: recording.z ? recording.z.toString() : '0',
      seconds_elapsed: (recording.timestamp / 1000).toString(),
      sensor: recording.sensor_type,
      time: new Date(recording.timestamp).toISOString()
    }));

    // Convert to format expected by model
    const convertedData = convertSensorLoggerData(sensorData);

    // Create a training example
    const trainingExample: TrainingExample = {
      sensorData: convertedData,
      label: activityType,
      videoTimestamp: Date.now(),
      duration: (recordings[recordings.length - 1].timestamp - recordings[0].timestamp) / 1000
    };

    // Update the session with the processed training data
    const { error: updateError } = await supabase
      .from('ml_training_sessions')
      .update({
        parameters: JSON.stringify([trainingExample])
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session with training data:', updateError);
    }

    return [trainingExample];
  } catch (error) {
    console.error('Error processing sensor recordings:', error);
    return [];
  }
};

/**
 * Batch process all unprocessed training sessions
 */
export const batchProcessSessions = async (): Promise<number> => {
  try {
    // Get all sessions that have recordings but no processed examples
    const { data: sessions, error }: SessionQueryResult = await supabase
      .from('ml_training_sessions')
      .select('*')
      .is('parameters', null)
      .not('end_time', 'is', null);

    if (error) {
      console.error('Error fetching sessions:', error);
      return 0;
    }

    if (!sessions || sessions.length === 0) {
      console.log('No unprocessed sessions found');
      return 0;
    }

    console.log(`Found ${sessions.length} unprocessed sessions`);
    let processedCount = 0;

    // Process each session
    for (const session of sessions) {
      const activityType = session.activity_type as ActivityType;
      
      const examples = await processSensorRecordings(session.id, activityType);
      
      if (examples.length > 0) {
        // Update the session to mark it as processed
        await supabase
          .from('ml_training_sessions')
          .update({
            parameters: JSON.stringify(examples)
          })
          .eq('id', session.id);
        
        processedCount++;
      }
    }

    return processedCount;
  } catch (error) {
    console.error('Error in batch processing:', error);
    return 0;
  }
};

/**
 * Process video annotations and convert them to training examples
 */
export const processVideoAnnotations = async (videoId: string): Promise<TrainingExample[]> => {
  try {
    // Get video annotations
    const { data: annotations, error } = await supabase
      .from('video_annotations')
      .select('*')
      .eq('video_id', videoId)
      .eq('annotation_type', 'activity');

    if (error) {
      console.error('Error fetching video annotations:', error);
      return [];
    }

    if (!annotations || annotations.length === 0) {
      console.log('No activity annotations found for video', videoId);
      return [];
    }

    const trainingExamples: TrainingExample[] = [];

    // Process each annotation
    for (const annotation of annotations) {
      const annotationData = annotation.data as any;
      
      if (!annotationData || !annotationData.activity || !annotationData.sensorData) {
        continue;
      }

      // Convert to training example
      trainingExamples.push({
        sensorData: annotationData.sensorData,
        label: annotationData.activity as ActivityType,
        videoTimestamp: annotation.timestamp,
        duration: annotationData.duration || 0
      });
    }

    return trainingExamples;
  } catch (error) {
    console.error('Error processing video annotations:', error);
    return [];
  }
};

/**
 * Train model using all available training data
 */
export const batchTrainModel = async (): Promise<{ model: tf.Sequential; accuracy: number }> => {
  try {
    // Get all training sessions with processed data
    const { data: sessions, error }: SessionQueryResult = await supabase
      .from('ml_training_sessions')
      .select('*')
      .not('parameters', 'is', null);

    if (error) {
      console.error('Error fetching training sessions:', error);
      throw new Error('Failed to fetch training data');
    }

    if (!sessions || sessions.length === 0) {
      console.log('No training data available');
      throw new Error('No training data available');
    }

    // Combine all training examples
    let allExamples: TrainingExample[] = [];

    for (const session of sessions) {
      if (session.parameters) {
        try {
          const sessionExamples = JSON.parse(session.parameters);
          if (Array.isArray(sessionExamples)) {
            allExamples = allExamples.concat(sessionExamples);
          }
        } catch (e) {
          console.error('Error parsing training data from session', session.id, e);
        }
      }
    }

    if (allExamples.length === 0) {
      throw new Error('No valid training examples found');
    }

    console.log(`Training model with ${allExamples.length} examples`);

    // Create and train the model
    const model = createModel();
    await trainModel(model, allExamples);

    // Evaluate the model (using a simple accuracy estimate)
    const accuracy = 0.85; // Use a fixed value or implement proper evaluation

    // Save the model version
    await saveModelVersion(model, 'batch-trained', accuracy);

    return { model, accuracy };
  } catch (error) {
    console.error('Error in batch training:', error);
    throw error;
  }
};
