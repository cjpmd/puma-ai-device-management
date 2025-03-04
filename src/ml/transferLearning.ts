
import * as tf from '@tensorflow/tfjs';
import { TrainingExample, ActivityType } from './activityRecognition';
import { ActivationIdentifier } from './types';

/**
 * Create a base model with transfer learning capabilities
 */
export const createBaseModel = (inputShape: [number, number, number] = [null, 4, 1]): tf.Sequential => {
  const model = tf.sequential();
  
  // Add base layers
  model.add(tf.layers.lstm({
    units: 64,
    inputShape: inputShape,
    returnSequences: true
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  model.add(tf.layers.lstm({
    units: 32,
    returnSequences: false
  }));
  
  // Add a dense layer but no output layer yet
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu' as ActivationIdentifier
  }));
  
  return model;
};

/**
 * Add an output layer to the base model for specific task
 */
export const addOutputLayer = (baseModel: tf.Sequential, numClasses: number): tf.Sequential => {
  const model = tf.sequential();
  
  // First, extract all layers except the last one from the base model
  const layers = [];
  for (let i = 0; i < baseModel.layers.length; i++) {
    layers.push(baseModel.layers[i]);
  }
  
  // Add all base layers to the new model
  for (const layer of layers) {
    model.add(layer);
  }
  
  // Add the output layer
  model.add(tf.layers.dense({
    units: numClasses,
    activation: 'softmax' as ActivationIdentifier
  }));
  
  return model;
};

/**
 * Train the model with transfer learning
 */
export const trainWithTransferLearning = async (
  baseModel: tf.Sequential,
  trainingData: TrainingExample[],
  activityTypes: ActivityType[] = ['pass', 'shot', 'dribble', 'touch', 'no_possession'],
  epochs: number = 20,
  batchSize: number = 32
): Promise<tf.History> => {
  // Prepare the training data
  const xs = tf.tensor3d(trainingData.map(ex => {
    // Reshape the data to match the model input shape
    const data = ex.sensorData.map(d => [d[0], d[1], d[2], d[3]]);
    return data;
  }));
  
  // Convert labels to one-hot encoding
  const oneHotLabels = trainingData.map(example => {
    const index = activityTypes.indexOf(example.label);
    const oneHot = new Array(activityTypes.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const ys = tf.tensor2d(oneHotLabels);
  
  // Create a model with the appropriate output layer
  const model = addOutputLayer(baseModel, activityTypes.length);
  
  // Compile the model for fine-tuning
  model.compile({
    optimizer: tf.train.adam(0.0001), // Lower learning rate for fine-tuning
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  // Train the model
  const history = await model.fit(xs, ys, {
    epochs: epochs,
    batchSize: batchSize,
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
  
  return history;
};

/**
 * Extract features from the base model
 */
export const extractFeatures = (baseModel: tf.Sequential, sensorData: number[][]): tf.Tensor => {
  // Create a new model that outputs the features from the base model
  const featureModel = tf.sequential();
  
  // Add all layers except the last one from the base model
  for (let i = 0; i < baseModel.layers.length - 1; i++) {
    featureModel.add(baseModel.layers[i]);
  }
  
  // Convert the input data to a tensor
  const inputTensor = tf.tensor3d([sensorData.map(d => [d[0], d[1], d[2], d[3]])]);
  
  // Get the features
  const features = featureModel.predict(inputTensor) as tf.Tensor;
  
  // Clean up
  inputTensor.dispose();
  
  return features;
};

/**
 * Save the base model for reuse
 */
export const saveBaseModel = async (model: tf.Sequential, filename: string = 'base-model'): Promise<void> => {
  try {
    await model.save(`localstorage://${filename}`);
    console.log(`Base model saved as ${filename}`);
  } catch (error) {
    console.error('Error saving base model:', error);
  }
};

/**
 * Load a saved base model
 */
export const loadBaseModel = async (filename: string = 'base-model'): Promise<tf.Sequential | null> => {
  try {
    const model = await tf.loadLayersModel(`localstorage://${filename}`) as tf.Sequential;
    console.log(`Base model loaded from ${filename}`);
    return model;
  } catch (error) {
    console.error('Error loading base model:', error);
    return null;
  }
};
