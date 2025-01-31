import * as tf from '@tensorflow/tfjs';

export type ActivityType = 'pass' | 'shot' | 'dribble' | 'touch' | 'no_possession';

export interface AppleWatchGyroData {
  x: string;
  y: string;
  z: string;
  seconds_elapsed: string;
  sensor: string;
  time: string;
}

export interface TrainingExample {
  sensorData: number[][];
  label: ActivityType;
  videoTimestamp: number;
  duration?: number;
}

export const validateSensorLoggerData = (data: any[]): boolean => {
  console.log('Validating data:', data);
  
  if (!Array.isArray(data)) {
    console.log('Data is not an array');
    return false;
  }
  
  // Check if array is empty
  if (data.length === 0) {
    console.log('Data array is empty');
    return false;
  }

  console.log('First entry:', data[0]);
  
  // Check if it's Apple Watch format by validating the first entry and sampling other entries
  const sampleSize = Math.min(100, data.length); // Check up to 100 entries
  const sampleStep = Math.floor(data.length / sampleSize);
  
  for (let i = 0; i < data.length; i += sampleStep) {
    const entry = data[i];
    if (!entry || typeof entry !== 'object') {
      console.log(`Entry ${i} is not an object:`, entry);
      return false;
    }
    
    // Check required fields exist and are strings
    const requiredFields = ['x', 'y', 'z', 'seconds_elapsed', 'sensor', 'time'];
    for (const field of requiredFields) {
      if (typeof entry[field] !== 'string') {
        // Skip entries with missing or invalid fields
        console.log(`Entry ${i}: ${field} is not a string:`, entry[field]);
        continue;
      }
      
      // Additional validation for numeric fields
      if (['x', 'y', 'z', 'seconds_elapsed'].includes(field)) {
        const value = parseFloat(entry[field]);
        if (isNaN(value)) {
          console.log(`Entry ${i}: ${field} is not a valid number:`, entry[field]);
          continue;
        }
      }
    }
    
    if (entry.sensor !== 'Gyroscope') {
      console.log(`Entry ${i}: sensor is not 'Gyroscope':`, entry.sensor);
      continue;
    }
  }
  
  // If we've made it here, enough valid entries exist to proceed
  console.log('Data validated successfully');
  return true;
};

export const convertSensorLoggerData = (data: AppleWatchGyroData[]): number[][] => {
  return data.map(entry => [
    parseFloat(entry.x),
    parseFloat(entry.y),
    parseFloat(entry.z),
    parseFloat(entry.seconds_elapsed)
  ]);
};

export const createModel = () => {
  const model = tf.sequential();
  
  model.add(tf.layers.lstm({
    units: 64,
    inputShape: [null, 4],
    returnSequences: true
  }));
  
  model.add(tf.layers.dropout({
    rate: 0.2
  }));
  
  model.add(tf.layers.lstm({
    units: 32,
    returnSequences: false
  }));
  
  model.add(tf.layers.dense({
    units: 5,
    activation: 'softmax'
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

export const trainModel = async (model: tf.Sequential, trainingData: TrainingExample[]) => {
  // Convert labels to one-hot encoding
  const activities: ActivityType[] = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
  const oneHotLabels = trainingData.map(example => {
    const index = activities.indexOf(example.label);
    const oneHot = new Array(activities.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  // Prepare training data
  const xs = tf.tensor3d(trainingData.map(ex => ex.sensorData));
  const ys = tf.tensor2d(oneHotLabels);
  
  // Train the model
  await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc.toFixed(4)}`);
      }
    }
  });
  
  // Clean up tensors
  xs.dispose();
  ys.dispose();
};