
import * as tf from '@tensorflow/tfjs';
import { TrainingExample, ActivityType } from './activityRecognition';
import { saveModelVersion } from './modelVersioning';

interface TransferLearningOptions {
  baseModelPath: string;
  targetClasses: ActivityType[];
  learningRate?: number;
  epochs?: number;
  batchSize?: number;
  fineTuningLayers?: number;
}

/**
 * Create a model for transfer learning from a pretrained base model
 */
export const createTransferModel = async (
  options: TransferLearningOptions
): Promise<tf.Sequential> => {
  const {
    baseModelPath,
    targetClasses,
    learningRate = 0.0001,
    fineTuningLayers = 2
  } = options;
  
  // Load the base model
  const baseModel = await tf.loadLayersModel(baseModelPath);
  
  // Create a new sequential model for transfer learning
  const model = tf.sequential();
  
  // Copy layers from the base model excluding the last few layers
  const layersToKeep = baseModel.layers.length - fineTuningLayers;
  
  for (let i = 0; i < layersToKeep; i++) {
    const layer = baseModel.layers[i];
    // For each layer, create a new layer with the same configuration
    // We cannot use clone() directly as it may not be available
    
    if (i === 0) {
      // For the first layer, we need to specify the input shape
      model.add(tf.layers.inputLayer({
        inputShape: layer.inputShape.slice(1) // Remove batch dimension
      }));
    }
    
    if (layer.getClassName() === 'Dense') {
      model.add(tf.layers.dense({
        units: (layer.outputShape as number[])[1],
        activation: layer.getConfig().activation,
        trainable: false
      }));
    } else if (layer.getClassName() === 'LSTM') {
      model.add(tf.layers.lstm({
        units: (layer.outputShape as number[])[layer.getConfig().return_sequences ? 2 : 1],
        returnSequences: layer.getConfig().return_sequences,
        activation: layer.getConfig().activation,
        trainable: false
      }));
    } else if (layer.getClassName() === 'Dropout') {
      model.add(tf.layers.dropout({
        rate: layer.getConfig().rate
      }));
    }
  }
  
  // Add new trainable layers for task-specific adaptation
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  // Add output layer with the target classes
  model.add(tf.layers.dense({
    units: targetClasses.length,
    activation: 'softmax'
  }));
  
  // Compile the model
  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

/**
 * Fine-tune a pretrained model with transfer learning
 */
export const fineTuneModel = async (
  baseModel: tf.Sequential,
  examples: TrainingExample[],
  options: {
    targetClasses: ActivityType[];
    learningRate?: number;
    epochs?: number;
    batchSize?: number;
    fineTuningLayers?: number;
    validationSplit?: number;
  }
): Promise<tf.History> => {
  const {
    targetClasses,
    learningRate = 0.0001,
    epochs = 20,
    batchSize = 32,
    fineTuningLayers = 2,
    validationSplit = 0.2
  } = options;
  
  // Create a new model for fine-tuning
  const model = tf.sequential();
  
  // Copy the layers from the base model
  const layersToUnfreeze = baseModel.layers.length - fineTuningLayers;
  
  for (let i = 0; i < baseModel.layers.length; i++) {
    const layer = baseModel.layers[i];
    const isTrainable = i >= layersToUnfreeze;
    
    // Create a new layer with the same configuration
    if (i === 0) {
      // For the first layer, we need to specify the input shape
      model.add(tf.layers.inputLayer({
        inputShape: layer.inputShape.slice(1) // Remove batch dimension
      }));
    }
    
    if (layer.getClassName() === 'Dense') {
      model.add(tf.layers.dense({
        units: (layer.outputShape as number[])[1],
        activation: layer.getConfig().activation,
        trainable: isTrainable
      }));
    } else if (layer.getClassName() === 'LSTM') {
      model.add(tf.layers.lstm({
        units: (layer.outputShape as number[])[layer.getConfig().return_sequences ? 2 : 1],
        returnSequences: layer.getConfig().return_sequences,
        activation: layer.getConfig().activation,
        trainable: isTrainable
      }));
    } else if (layer.getClassName() === 'Dropout') {
      model.add(tf.layers.dropout({
        rate: layer.getConfig().rate
      }));
    }
  }
  
  // Compile the model
  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  // Prepare the training data
  const xs = tf.tensor3d(examples.map(ex => ex.sensorData));
  
  // Convert labels to one-hot encoding
  const oneHotLabels = examples.map(example => {
    const index = targetClasses.indexOf(example.label);
    const oneHot = new Array(targetClasses.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const ys = tf.tensor2d(oneHotLabels);
  
  // Train the model
  const history = await model.fit(xs, ys, {
    epochs,
    batchSize,
    validationSplit,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc.toFixed(4)}`);
      }
    }
  });
  
  // Save the fine-tuned model
  const accuracy = history.history.acc[history.history.acc.length - 1];
  await saveModelVersion(model, `fine-tuned-v${Date.now()}`, accuracy);
  
  // Cleanup tensors
  xs.dispose();
  ys.dispose();
  
  return history;
};
