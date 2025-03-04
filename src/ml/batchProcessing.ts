
import { SensorData, TrainingExample, convertSensorLoggerData, validateSensorLoggerData } from './activityRecognition';
import { supabase } from '@/integrations/supabase/client';

export interface BatchProcessingResult {
  successCount: number;
  errorCount: number;
  sessionId: string;
  errors: string[];
}

export interface ProcessingProgress {
  current: number;
  total: number;
  percentComplete: number;
  currentFile: string;
}

/**
 * Process multiple sensor data files in batch
 */
export const processSensorDataBatch = async (
  files: File[],
  sessionId: string,
  onProgress?: (progress: ProcessingProgress) => void,
  onComplete?: (result: BatchProcessingResult) => void
): Promise<BatchProcessingResult> => {
  const result: BatchProcessingResult = {
    successCount: 0,
    errorCount: 0,
    sessionId,
    errors: []
  };
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: files.length,
        percentComplete: ((i + 1) / files.length) * 100,
        currentFile: file.name
      });
    }
    
    try {
      const data = await readJsonFile(file);
      
      if (validateSensorLoggerData(data)) {
        const sensorData = data as SensorData[];
        
        // Store sensor recordings in Supabase
        const sensorRecordings = sensorData.map(reading => ({
          training_session_id: sessionId,
          sensor_type: reading.sensor,
          x: parseFloat(reading.x),
          y: parseFloat(reading.y),
          z: parseFloat(reading.z),
          timestamp: new Date(reading.time).getTime()
        }));
        
        // Insert in batches to avoid payload size limitations
        const batchSize = 100;
        let success = true;
        
        for (let j = 0; j < sensorRecordings.length; j += batchSize) {
          const batch = sensorRecordings.slice(j, j + batchSize);
          
          const { error } = await supabase
            .from('sensor_recordings')
            .insert(batch);
          
          if (error) {
            console.error(`Error storing batch from ${file.name}:`, error);
            result.errors.push(`Error in ${file.name}: ${error.message}`);
            success = false;
            break;
          }
        }
        
        if (success) {
          result.successCount++;
        } else {
          result.errorCount++;
        }
      } else {
        result.errorCount++;
        result.errors.push(`Invalid format in ${file.name}`);
      }
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      result.errorCount++;
      result.errors.push(`Error in ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  if (onComplete) {
    onComplete(result);
  }
  
  return result;
};

/**
 * Read a JSON file and parse its contents
 */
const readJsonFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
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
 * Process video annotations in batch
 */
export const processVideoBatch = async (
  videoFiles: File[],
  annotationFiles: File[],
  sessionId: string,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<BatchProcessingResult> => {
  const result: BatchProcessingResult = {
    successCount: 0,
    errorCount: 0,
    sessionId,
    errors: []
  };
  
  // Check if videos and annotations match
  if (videoFiles.length !== annotationFiles.length) {
    result.errors.push('Number of video files does not match number of annotation files');
    result.errorCount = Math.max(videoFiles.length, annotationFiles.length);
    return result;
  }
  
  const totalFiles = videoFiles.length;
  
  for (let i = 0; i < totalFiles; i++) {
    const videoFile = videoFiles[i];
    const annotationFile = annotationFiles[i];
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: totalFiles,
        percentComplete: ((i + 1) / totalFiles) * 100,
        currentFile: videoFile.name
      });
    }
    
    try {
      // Process annotation file
      const annotationData = await readJsonFile(annotationFile);
      
      // Store video metadata in Supabase
      const { data: videoData, error: videoError } = await supabase
        .from('video_analysis')
        .insert({
          title: videoFile.name,
          video_path: URL.createObjectURL(videoFile),
          date: new Date().toISOString().split('T')[0],
          training_session_id: sessionId
        })
        .select('id')
        .single();
      
      if (videoError) {
        console.error(`Error storing video ${videoFile.name}:`, videoError);
        result.errors.push(`Error in ${videoFile.name}: ${videoError.message}`);
        result.errorCount++;
        continue;
      }
      
      // Process annotations
      const annotations = extractAnnotationsFromViaFormat(annotationData, videoData.id);
      
      if (annotations.length > 0) {
        const { error: annotationError } = await supabase
          .from('video_annotations')
          .insert(annotations);
        
        if (annotationError) {
          console.error(`Error storing annotations for ${videoFile.name}:`, annotationError);
          result.errors.push(`Error in annotations for ${videoFile.name}: ${annotationError.message}`);
          result.errorCount++;
          continue;
        }
        
        result.successCount++;
      } else {
        result.errors.push(`No valid annotations found in ${annotationFile.name}`);
        result.errorCount++;
      }
    } catch (error) {
      console.error(`Error processing ${videoFile.name}:`, error);
      result.errors.push(`Error in ${videoFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.errorCount++;
    }
  }
  
  return result;
};

/**
 * Extract annotations from VIA (VGG Image Annotator) format
 */
const extractAnnotationsFromViaFormat = (
  viaData: any,
  videoId: string
): any[] => {
  const annotations: any[] = [];
  
  try {
    // VIA stores data in format: {"filename": {"metadata": {"vid_1": {"z":[0,2.3],"xy":[],"av":{"1":"pass"}}}}}
    Object.values(viaData).forEach((fileData: any) => {
      if (fileData.metadata) {
        Object.values(fileData.metadata).forEach((segment: any) => {
          if (segment.z && segment.z.length === 2 && segment.av) {
            const activityValue = Object.values(segment.av)[0] as string;
            const validActivityTypes = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
            
            if (validActivityTypes.includes(activityValue)) {
              annotations.push({
                video_id: videoId,
                timestamp: Math.floor(segment.z[0] * 1000), // Convert to milliseconds
                annotation_type: activityValue,
                data: {
                  startTime: segment.z[0],
                  endTime: segment.z[1],
                  duration: segment.z[1] - segment.z[0]
                }
              });
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('Error parsing VIA annotations:', error);
  }
  
  return annotations;
};

/**
 * Generate training examples from sensor data and annotations
 */
export const generateTrainingExamplesFromBatch = async (
  sessionId: string,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<TrainingExample[]> => {
  const trainingExamples: TrainingExample[] = [];
  
  try {
    // Fetch all annotations for the session
    const { data: videos, error: videoError } = await supabase
      .from('video_analysis')
      .select('id, training_session_id')
      .eq('training_session_id', sessionId);
    
    if (videoError) {
      console.error('Error fetching videos:', videoError);
      return [];
    }
    
    const videoIds = videos.map(v => v.id);
    
    const { data: annotations, error: annotationError } = await supabase
      .from('video_annotations')
      .select('*')
      .in('video_id', videoIds);
    
    if (annotationError) {
      console.error('Error fetching annotations:', annotationError);
      return [];
    }
    
    const totalAnnotations = annotations.length;
    
    // Process each annotation
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: totalAnnotations,
          percentComplete: ((i + 1) / totalAnnotations) * 100,
          currentFile: `Annotation ${i + 1}/${totalAnnotations}`
        });
      }
      
      // Get sensor data for this time range
      const startTime = annotation.timestamp;
      const endTime = startTime + (annotation.data.duration * 1000);
      
      const { data: sensorData, error: sensorError } = await supabase
        .from('sensor_recordings')
        .select('*')
        .eq('training_session_id', sessionId)
        .gte('timestamp', startTime)
        .lte('timestamp', endTime);
      
      if (sensorError) {
        console.error('Error fetching sensor data:', sensorError);
        continue;
      }
      
      if (sensorData.length > 0) {
        const formattedSensorData: SensorData[] = sensorData.map(record => ({
          sensor: record.sensor_type,
          x: record.x.toString(),
          y: record.y.toString(),
          z: record.z.toString(),
          seconds_elapsed: ((record.timestamp - startTime) / 1000).toString(),
          time: new Date(record.timestamp).toISOString()
        }));
        
        const convertedData = convertSensorLoggerData(formattedSensorData);
        
        trainingExamples.push({
          sensorData: convertedData,
          label: annotation.annotation_type,
          videoTimestamp: startTime,
          duration: annotation.data.duration * 1000
        });
      }
    }
  } catch (error) {
    console.error('Error generating training examples:', error);
  }
  
  return trainingExamples;
};
