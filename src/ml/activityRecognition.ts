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
  if (!Array.isArray(data)) {
    console.log('Data is not an array');
    return false;
  }
  
  // Check if it's Apple Watch format
  return data.every(entry => 
    typeof entry === 'object' &&
    typeof entry.x === 'string' &&
    typeof entry.y === 'string' &&
    typeof entry.z === 'string' &&
    typeof entry.seconds_elapsed === 'string' &&
    typeof entry.sensor === 'string' &&
    entry.sensor === 'Gyroscope' &&
    typeof entry.time === 'string'
  );
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
  
  // Input shape: [timesteps, features]
  // Features: x, y, z acceleration, and time
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