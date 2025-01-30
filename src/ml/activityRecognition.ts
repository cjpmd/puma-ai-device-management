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
  if (!Array.isArray(data)) return false;
  
  // Check if it's Apple Watch format
  if (data[0]?.sensor === 'Gyroscope') {
    return data.every(entry => 
      typeof entry.x === 'string' &&
      typeof entry.y === 'string' &&
      typeof entry.z === 'string' &&
      typeof entry.seconds_elapsed === 'string' &&
      entry.sensor === 'Gyroscope'
    );
  }
  
  // Add other format validations here if needed
  return false;
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
  
  model.add(tf.layers.dropout(0.2));
  
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
  const xs = tf.ragged.stack(trainingData.map(example => 
    tf.tensor2d(example.sensorData)
  ));
  
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