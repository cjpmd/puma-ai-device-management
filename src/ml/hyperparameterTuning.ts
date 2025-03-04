
import * as tf from '@tensorflow/tfjs';
import { TrainingExample } from './activityRecognition';

export interface ModelHyperparameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  lstmUnits1: number;
  lstmUnits2: number;
  dropoutRate: number;
}

export interface HyperparameterSearchSpace {
  learningRate: number[];
  batchSize: number[];
  epochs: number[];
  lstmUnits1: number[];
  lstmUnits2: number[];
  dropoutRate: number[];
}

export interface TrainingHistory {
  accuracy: number[];
  loss: number[];
  valAccuracy: number[];
  valLoss: number[];
}

export interface HyperparameterResult {
  hyperparameters: ModelHyperparameters;
  finalAccuracy: number;
  finalLoss: number;
  history: TrainingHistory;
}

/**
 * Create a model with specified hyperparameters
 */
export const createModelWithHyperparameters = (
  hyperparameters: ModelHyperparameters
): tf.Sequential => {
  const model = tf.sequential();
  
  model.add(tf.layers.lstm({
    units: hyperparameters.lstmUnits1,
    inputShape: [null, 4],
    returnSequences: true
  }));
  
  model.add(tf.layers.dropout({
    rate: hyperparameters.dropoutRate
  }));
  
  model.add(tf.layers.lstm({
    units: hyperparameters.lstmUnits2,
    returnSequences: false
  }));
  
  model.add(tf.layers.dense({
    units: 5,
    activation: 'softmax'
  }));
  
  model.compile({
    optimizer: tf.train.adam(hyperparameters.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

/**
 * Train a model with specified hyperparameters
 */
export const trainModelWithHyperparameters = async (
  model: tf.Sequential,
  trainingData: TrainingExample[],
  validationData: TrainingExample[],
  hyperparameters: ModelHyperparameters,
  onEpochEnd?: (epoch: number, logs: tf.Logs) => void
): Promise<TrainingHistory> => {
  // Convert training data to tensors
  const activities: string[] = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
  
  const trainOneHotLabels = trainingData.map(example => {
    const index = activities.indexOf(example.label);
    const oneHot = new Array(activities.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const valOneHotLabels = validationData.map(example => {
    const index = activities.indexOf(example.label);
    const oneHot = new Array(activities.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const xsTrain = tf.tensor3d(trainingData.map(ex => ex.sensorData));
  const ysTrain = tf.tensor2d(trainOneHotLabels);
  
  const xsVal = tf.tensor3d(validationData.map(ex => ex.sensorData));
  const ysVal = tf.tensor2d(valOneHotLabels);
  
  // Define training history
  const history: TrainingHistory = {
    accuracy: [],
    loss: [],
    valAccuracy: [],
    valLoss: []
  };
  
  // Train the model
  await model.fit(xsTrain, ysTrain, {
    epochs: hyperparameters.epochs,
    batchSize: hyperparameters.batchSize,
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
  
  // Clean up tensors
  xsTrain.dispose();
  ysTrain.dispose();
  xsVal.dispose();
  ysVal.dispose();
  
  return history;
};

/**
 * Perform grid search over hyperparameter space
 */
export const gridSearch = async (
  trainingData: TrainingExample[],
  validationData: TrainingExample[],
  searchSpace: HyperparameterSearchSpace,
  onProgressUpdate: (
    current: number, 
    total: number, 
    hyperparameters: ModelHyperparameters, 
    accuracy: number
  ) => void
): Promise<HyperparameterResult[]> => {
  const results: HyperparameterResult[] = [];
  
  // Calculate total number of combinations
  const totalCombinations = 
    searchSpace.learningRate.length *
    searchSpace.batchSize.length *
    searchSpace.epochs.length *
    searchSpace.lstmUnits1.length *
    searchSpace.lstmUnits2.length *
    searchSpace.dropoutRate.length;
  
  let currentCombination = 0;
  
  // Iterate through all hyperparameter combinations
  for (const learningRate of searchSpace.learningRate) {
    for (const batchSize of searchSpace.batchSize) {
      for (const epochs of searchSpace.epochs) {
        for (const lstmUnits1 of searchSpace.lstmUnits1) {
          for (const lstmUnits2 of searchSpace.lstmUnits2) {
            for (const dropoutRate of searchSpace.dropoutRate) {
              const hyperparameters: ModelHyperparameters = {
                learningRate,
                batchSize,
                epochs,
                lstmUnits1,
                lstmUnits2,
                dropoutRate
              };
              
              // Train model with current hyperparameters
              const model = createModelWithHyperparameters(hyperparameters);
              const history = await trainModelWithHyperparameters(
                model, 
                trainingData, 
                validationData, 
                hyperparameters
              );
              
              // Calculate final metrics
              const finalAccuracy = history.valAccuracy[history.valAccuracy.length - 1];
              const finalLoss = history.valLoss[history.valLoss.length - 1];
              
              // Store results
              results.push({
                hyperparameters,
                finalAccuracy,
                finalLoss,
                history
              });
              
              // Update progress
              currentCombination++;
              onProgressUpdate(
                currentCombination, 
                totalCombinations, 
                hyperparameters, 
                finalAccuracy
              );
              
              // Dispose model
              model.dispose();
            }
          }
        }
      }
    }
  }
  
  // Sort results by validation accuracy
  return results.sort((a, b) => b.finalAccuracy - a.finalAccuracy);
};

/**
 * Generate a randomized search space for hyperparameters
 */
export const generateRandomSearchSpace = (
  numSamples: number = 10
): HyperparameterSearchSpace => {
  return {
    learningRate: generateLogspace(0.0001, 0.01, numSamples),
    batchSize: [8, 16, 32, 64],
    epochs: [10, 20, 50],
    lstmUnits1: [32, 64, 128],
    lstmUnits2: [16, 32, 64],
    dropoutRate: [0.1, 0.2, 0.3, 0.4]
  };
};

/**
 * Generate a logarithmically spaced array of values
 */
const generateLogspace = (
  min: number, 
  max: number, 
  count: number
): number[] => {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const step = (logMax - logMin) / (count - 1);
  
  return Array.from({ length: count }, (_, i) => {
    const logValue = logMin + i * step;
    return Number(Math.pow(10, logValue).toFixed(6));
  });
};
