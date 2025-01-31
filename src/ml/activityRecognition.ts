import * as tf from '@tensorflow/tfjs';

export type ActivityType = 'pass' | 'shot' | 'dribble' | 'touch' | 'no_possession';

export interface TrainingExample {
  sensorData: number[][];
  label: ActivityType;
  videoTimestamp: number;
  duration?: number;
}

interface AppleWatchGyroData {
  x: string;
  y: string;
  z: string;
  seconds_elapsed: string;
  sensor: string;
  time: string;
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
  
  // Check if it's Apple Watch format
  const isValid = data.every((entry, index) => {
    if (typeof entry !== 'object') {
      console.log(`Entry ${index} is not an object:`, entry);
      return false;
    }
    if (typeof entry.x !== 'string') {
      console.log(`Entry ${index}: x is not a string:`, entry.x);
      return false;
    }
    if (typeof entry.y !== 'string') {
      console.log(`Entry ${index}: y is not a string:`, entry.y);
      return false;
    }
    if (typeof entry.z !== 'string') {
      console.log(`Entry ${index}: z is not a string:`, entry.z);
      return false;
    }
    if (typeof entry.seconds_elapsed !== 'string') {
      console.log(`Entry ${index}: seconds_elapsed is not a string:`, entry.seconds_elapsed);
      return false;
    }
    if (typeof entry.sensor !== 'string') {
      console.log(`Entry ${index}: sensor is not a string:`, entry.sensor);
      return false;
    }
    if (entry.sensor !== 'Gyroscope') {
      console.log(`Entry ${index}: sensor is not 'Gyroscope':`, entry.sensor);
      return false;
    }
    if (typeof entry.time !== 'string') {
      console.log(`Entry ${index}: time is not a string:`, entry.time);
      return false;
    }
    return true;
  });

  if (!isValid) {
    console.log('Validation failed');
  } else {
    console.log('Data validated successfully');
  }

  return isValid;
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
    units: 5, // number of activity types
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
  // First, pad all sequences to the same length
  const maxLength = Math.max(...trainingData.map(ex => ex.sensorData.length));
  const paddedData = trainingData.map(example => {
    const data = example.sensorData;
    if (data.length < maxLength) {
      const padding = Array(maxLength - data.length).fill([0, 0, 0, 0]);
      return [...data, ...padding];
    }
    return data;
  });

  // Convert to tensor
  const xs = tf.tensor3d(paddedData);
  const ys = tf.tensor2d(oneHotLabels);

  // Train the model
  await model.fit(xs, ys, {
    epochs: 50,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc.toFixed(4)}`);
      }
    }
  });

  return model;
};