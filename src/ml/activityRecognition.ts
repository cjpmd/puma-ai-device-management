import * as tf from '@tensorflow/tfjs';

export type ActivityType = 'pass' | 'shot' | 'dribble' | 'touch' | 'no_possession';

export interface SensorData {
  x: string;
  y: string;
  z: string;
  seconds_elapsed: string;
  sensor: string;
  time: string;
  latitude?: string;
  longitude?: string;
}

export interface TrainingExample {
  sensorData: number[][];
  label: ActivityType;
  videoTimestamp: number;
  duration?: number;
}

export const validateSensorLoggerData = (data: any[]): boolean => {
  if (!Array.isArray(data)) {
    console.log('Data is not an array');
    return false;
  }
  
  if (data.length === 0) {
    console.log('Data array is empty');
    return false;
  }

  console.log('First entry:', data[0]);
  
  const validSensors = [
    'Gyroscope', 
    'GyroscopeUncalibrated', 
    'Accelerometer', 
    'AccelerometerUncalibrated',
    'Pedometer',
    'Location'
  ];

  const validEntries = data.filter(entry => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    if (!validSensors.includes(entry.sensor)) {
      console.log(`Skipping entry with sensor type: ${entry.sensor}`);
      return false;
    }

    // Special handling for Location sensor
    if (entry.sensor === 'Location') {
      return typeof entry.latitude === 'string' && 
             typeof entry.longitude === 'string' &&
             typeof entry.time === 'string';
    }

    // For motion sensors
    const requiredFields = ['x', 'y', 'z', 'seconds_elapsed', 'time'];
    for (const field of requiredFields) {
      if (typeof entry[field] !== 'string' || entry[field] === undefined) {
        console.log(`Entry missing or invalid ${field}:`, entry[field]);
        return false;
      }
      
      if (['x', 'y', 'z', 'seconds_elapsed'].includes(field)) {
        const value = parseFloat(entry[field]);
        if (isNaN(value)) {
          console.log(`Invalid numeric value for ${field}:`, entry[field]);
          return false;
        }
      }
    }
    
    return true;
  });

  console.log(`Found ${validEntries.length} valid entries out of ${data.length} total`);
  return validEntries.length > 0;
};

export const convertSensorLoggerData = (data: SensorData[]): number[][] => {
  return data
    .filter(entry => entry.sensor !== 'Location' && entry.sensor !== 'Pedometer')
    .map(entry => [
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
