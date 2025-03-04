
import * as tf from '@tensorflow/tfjs';
import { ActivityType, SensorData } from './activityRecognition';

export interface InferenceResult {
  prediction: ActivityType;
  confidence: number;
  probabilities: Record<ActivityType, number>;
  timestamp: number;
}

export interface InferenceOptions {
  windowSize: number;
  stepSize: number;
  confidenceThreshold: number;
}

/**
 * Class for handling real-time activity inference
 */
export class RealTimeInference {
  private model: tf.Sequential | null = null;
  private sensorBuffer: SensorData[] = [];
  private options: InferenceOptions;
  private activities: ActivityType[] = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
  private latestResult: InferenceResult | null = null;
  
  constructor(options?: Partial<InferenceOptions>) {
    this.options = {
      windowSize: 100, // Number of sensor readings to use for each prediction
      stepSize: 20,    // How many readings to advance when sliding the window
      confidenceThreshold: 0.7, // Minimum confidence to report a prediction
      ...options
    };
  }
  
  /**
   * Load a model for inference
   */
  async loadModel(model: tf.Sequential): Promise<void> {
    this.model = model;
  }
  
  /**
   * Add new sensor readings to the buffer
   */
  addSensorData(readings: SensorData[]): void {
    this.sensorBuffer.push(...readings);
    
    // Trim buffer if it gets too large
    const maxBufferSize = this.options.windowSize * 5;
    if (this.sensorBuffer.length > maxBufferSize) {
      this.sensorBuffer = this.sensorBuffer.slice(-maxBufferSize);
    }
  }
  
  /**
   * Process the current sensor buffer and make predictions
   */
  async processSensorBuffer(): Promise<InferenceResult | null> {
    if (!this.model || this.sensorBuffer.length < this.options.windowSize) {
      return null;
    }
    
    // Create sliding windows from the buffer
    const windows: SensorData[][] = [];
    for (let i = 0; i <= this.sensorBuffer.length - this.options.windowSize; i += this.options.stepSize) {
      windows.push(this.sensorBuffer.slice(i, i + this.options.windowSize));
    }
    
    // No windows created
    if (windows.length === 0) {
      return null;
    }
    
    // Process each window
    const predictions: InferenceResult[] = [];
    
    for (const window of windows) {
      // Convert sensor data format
      const convertedData = convertSensorLoggerData(window);
      
      // Make prediction
      const inputTensor = tf.tensor3d([convertedData]);
      const outputTensor = this.model.predict(inputTensor) as tf.Tensor;
      const probabilities = await outputTensor.data();
      
      // Get highest probability class
      const maxProbIdx = Array.from(probabilities).indexOf(Math.max(...Array.from(probabilities)));
      const prediction = this.activities[maxProbIdx];
      const confidence = probabilities[maxProbIdx];
      
      // Create probability map
      const probabilityMap = {} as Record<ActivityType, number>;
      this.activities.forEach((activity, i) => {
        probabilityMap[activity] = probabilities[i];
      });
      
      // Add prediction if confidence is high enough
      if (confidence >= this.options.confidenceThreshold) {
        predictions.push({
          prediction,
          confidence,
          probabilities: probabilityMap,
          timestamp: Date.now()
        });
      }
      
      // Clean up tensors
      inputTensor.dispose();
      outputTensor.dispose();
    }
    
    // Return the prediction with highest confidence
    if (predictions.length > 0) {
      predictions.sort((a, b) => b.confidence - a.confidence);
      this.latestResult = predictions[0];
      return this.latestResult;
    }
    
    return this.latestResult;
  }
  
  /**
   * Clear the sensor buffer
   */
  clearBuffer(): void {
    this.sensorBuffer = [];
    this.latestResult = null;
  }
  
  /**
   * Get the latest prediction result
   */
  getLatestResult(): InferenceResult | null {
    return this.latestResult;
  }
}

// Import from activityRecognition
import { convertSensorLoggerData } from './activityRecognition';
