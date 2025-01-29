import * as tf from '@tensorflow/tfjs';

// Define the shape of our input data
export interface SensorData {
  accelerometer: number[][];  // [timestamp, x, y, z]
  gyroscope: number[][];     // [timestamp, x, y, z]
  impactForce: number[];     // Force in G's
}

export interface TrainingExample {
  sensorData: SensorData;
  label: 'shot' | 'pass';  // The ground truth label
  videoTimestamp: number;  // For synchronization with video data
}

// Model configuration
const MODEL_CONFIG = {
  sequenceLength: 100,  // Number of sensor readings to consider (100Hz = 1 second)
  numFeatures: 7,      // 3 accel + 3 gyro + 1 impact force
  numClasses: 2,       // Shot or Pass
  batchSize: 32,
  epochs: 50,
  learningRate: 0.001,
};

// Create the LSTM model architecture
export function createModel(): tf.LayersModel {
  const model = tf.sequential();

  // Add LSTM layers
  model.add(tf.layers.lstm({
    units: 64,
    inputShape: [MODEL_CONFIG.sequenceLength, MODEL_CONFIG.numFeatures],
    returnSequences: true
  }));
  
  model.add(tf.layers.dropout({
    rate: 0.2
  }));
  
  model.add(tf.layers.lstm({
    units: 32,
    returnSequences: false
  }));
  
  model.add(tf.layers.dropout({
    rate: 0.2
  }));

  // Dense layers for classification
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu'
  }));

  model.add(tf.layers.dense({
    units: MODEL_CONFIG.numClasses,
    activation: 'softmax'
  }));

  // Compile the model
  model.compile({
    optimizer: tf.train.adam(MODEL_CONFIG.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}

// Preprocess sensor data into the format expected by the model
export function preprocessData(example: TrainingExample): tf.Tensor2D {
  const { accelerometer, gyroscope, impactForce } = example.sensorData;
  
  // Combine all sensor data into feature vectors
  const features = accelerometer.map((accel, i) => [
    ...accel.slice(1),           // Skip timestamp, take x,y,z
    ...gyroscope[i].slice(1),    // Skip timestamp, take x,y,z
    impactForce[i]               // Impact force
  ]);

  // Ensure we have the correct sequence length
  const paddedFeatures = padSequence(features, MODEL_CONFIG.sequenceLength);
  
  return tf.tensor2d(paddedFeatures, [MODEL_CONFIG.sequenceLength, MODEL_CONFIG.numFeatures]);
}

// Helper function to pad/truncate sequences to the desired length
function padSequence(sequence: number[][], desiredLength: number): number[][] {
  if (sequence.length > desiredLength) {
    return sequence.slice(0, desiredLength);
  }
  
  const padding = Array(desiredLength - sequence.length).fill(
    Array(sequence[0].length).fill(0)
  );
  
  return [...sequence, ...padding];
}

// Training function
export async function trainModel(
  model: tf.LayersModel,
  trainingData: TrainingExample[],
  validationSplit = 0.2
): Promise<tf.History> {
  // Prepare training data
  const xs = trainingData.map(example => preprocessData(example));
  const ys = trainingData.map(example => 
    example.label === 'shot' ? [1, 0] : [0, 1]
  );

  // Split into training and validation sets
  const splitIndex = Math.floor(trainingData.length * (1 - validationSplit));
  const trainingXs = xs.slice(0, splitIndex);
  const trainingYs = ys.slice(0, splitIndex);
  const validationXs = xs.slice(splitIndex);
  const validationYs = ys.slice(splitIndex);

  // Convert to tensors
  const trainingXDataset = tf.data.array(trainingXs);
  const trainingYDataset = tf.data.array(trainingYs);
  const validationXDataset = tf.data.array(validationXs);
  const validationYDataset = tf.data.array(validationYs);

  // Create training and validation datasets
  const trainingDataset = tf.data.zip({xs: trainingXDataset, ys: trainingYDataset})
    .shuffle(trainingXs.length)
    .batch(MODEL_CONFIG.batchSize);

  const validationDataset = tf.data.zip({xs: validationXDataset, ys: validationYDataset})
    .batch(MODEL_CONFIG.batchSize);

  // Train the model
  return await model.fitDataset(trainingDataset, {
    epochs: MODEL_CONFIG.epochs,
    validationData: validationDataset,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc.toFixed(4)}`);
      }
    }
  });
}

// Prediction function
export async function predictActivity(
  model: tf.LayersModel,
  sensorData: SensorData
): Promise<{label: 'shot' | 'pass', confidence: number}> {
  const input = preprocessData({
    sensorData,
    label: 'shot', // Dummy label for preprocessing
    videoTimestamp: 0
  });

  const prediction = await model.predict(input.expandDims(0)) as tf.Tensor;
  const [shotProb, passProb] = Array.from(await prediction.data());

  return {
    label: shotProb > passProb ? 'shot' : 'pass',
    confidence: Math.max(shotProb, passProb)
  };
}