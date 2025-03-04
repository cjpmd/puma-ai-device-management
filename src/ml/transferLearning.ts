
import * as tf from '@tensorflow/tfjs';
import { TrainingExample } from './activityRecognition';

/**
 * Freeze the base layers of a model for transfer learning
 */
export const freezeBaseLayers = (model: tf.Sequential): tf.Sequential => {
  // Freeze all layers except the last one (output layer)
  for (let i = 0; i < model.layers.length - 1; i++) {
    model.layers[i].trainable = false;
  }
  
  return model;
};

/**
 * Unfreeze all layers in a model
 */
export const unfreezeAllLayers = (model: tf.Sequential): tf.Sequential => {
  for (let i = 0; i < model.layers.length; i++) {
    model.layers[i].trainable = true;
  }
  
  return model;
};

/**
 * Initialize a new model with weights from a pre-trained model
 * except for the output layer
 */
export const initializeFromPretrainedModel = (
  pretrainedModel: tf.Sequential,
  numOutputClasses: number
): tf.Sequential => {
  // Create a new model with the same architecture
  const newModel = tf.sequential();
  
  // Copy all layers except the output layer
  for (let i = 0; i < pretrainedModel.layers.length - 1; i++) {
    newModel.add(pretrainedModel.layers[i].clone());
  }
  
  // Add a new output layer
  newModel.add(tf.layers.dense({
    units: numOutputClasses,
    activation: 'softmax'
  }));
  
  return newModel;
};

/**
 * Perform transfer learning with a pre-trained model
 */
export const performTransferLearning = async (
  pretrainedModel: tf.Sequential,
  trainingData: TrainingExample[],
  validationData: TrainingExample[],
  numOutputClasses: number = 5,
  fineTuningEpochs: number = 10,
  fineTuningLearningRate: number = 0.0001,
  onEpochEnd?: (epoch: number, logs: tf.Logs) => void
): Promise<{
  model: tf.Sequential;
  history: {
    accuracy: number[];
    loss: number[];
    valAccuracy: number[];
    valLoss: number[];
  }
}> => {
  // Clone the pre-trained model
  const model = tf.sequential();
  
  // Copy all layers except the output layer
  for (let i = 0; i < pretrainedModel.layers.length - 1; i++) {
    model.add(pretrainedModel.layers[i].clone());
  }
  
  // Add a new output layer
  model.add(tf.layers.dense({
    units: numOutputClasses,
    activation: 'softmax'
  }));
  
  // Freeze base layers for initial training
  freezeBaseLayers(model);
  
  // Compile the model
  model.compile({
    optimizer: tf.train.adam(fineTuningLearningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  // Prepare training data
  const activities = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
  
  const trainLabels = trainingData.map(example => {
    const index = activities.indexOf(example.label);
    const oneHot = new Array(numOutputClasses).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const valLabels = validationData.map(example => {
    const index = activities.indexOf(example.label);
    const oneHot = new Array(numOutputClasses).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const xsTrain = tf.tensor3d(trainingData.map(ex => ex.sensorData));
  const ysTrain = tf.tensor2d(trainLabels);
  
  const xsVal = tf.tensor3d(validationData.map(ex => ex.sensorData));
  const ysVal = tf.tensor2d(valLabels);
  
  // Training history
  const history = {
    accuracy: [] as number[],
    loss: [] as number[],
    valAccuracy: [] as number[],
    valLoss: [] as number[]
  };
  
  // First phase: train only the top layer
  await model.fit(xsTrain, ysTrain, {
    epochs: fineTuningEpochs,
    batchSize: 32,
    validationData: [xsVal, ysVal],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (logs) {
          history.accuracy.push(logs.acc);
          history.loss.push(logs.loss);
          history.valAccuracy.push(logs.val_acc);
          history.valLoss.push(logs.val_loss);
          
          if (onEpochEnd) {
            onEpochEnd(epoch, logs);
          }
        }
      }
    }
  });
  
  // Second phase: fine-tune all layers
  unfreezeAllLayers(model);
  
  model.compile({
    optimizer: tf.train.adam(fineTuningLearningRate / 10),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  await model.fit(xsTrain, ysTrain, {
    epochs: fineTuningEpochs,
    batchSize: 32,
    validationData: [xsVal, ysVal],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (logs) {
          history.accuracy.push(logs.acc);
          history.loss.push(logs.loss);
          history.valAccuracy.push(logs.val_acc);
          history.valLoss.push(logs.val_loss);
          
          if (onEpochEnd) {
            onEpochEnd(epoch + fineTuningEpochs, logs);
          }
        }
      }
    }
  });
  
  // Clean up tensors
  xsTrain.dispose();
  ysTrain.dispose();
  xsVal.dispose();
  ysVal.dispose();
  
  return { model, history };
};
