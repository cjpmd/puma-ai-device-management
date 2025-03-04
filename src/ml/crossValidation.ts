
import * as tf from '@tensorflow/tfjs';
import { TrainingExample } from './activityRecognition';
import { ModelHyperparameters, createModelWithHyperparameters } from './hyperparameterTuning';

export interface CrossValidationFold {
  trainData: TrainingExample[];
  valData: TrainingExample[];
}

export interface CrossValidationResult {
  foldAccuracies: number[];
  foldLosses: number[];
  avgAccuracy: number;
  avgLoss: number;
  stdAccuracy: number;
  stdLoss: number;
}

/**
 * Split data into k folds for cross-validation
 */
export const createKFolds = (
  data: TrainingExample[],
  k: number = 5
): CrossValidationFold[] => {
  // Shuffle data
  const shuffled = [...data].sort(() => 0.5 - Math.random());
  
  // Calculate fold size
  const foldSize = Math.floor(shuffled.length / k);
  
  // Create folds
  const folds: CrossValidationFold[] = [];
  
  for (let i = 0; i < k; i++) {
    const startIdx = i * foldSize;
    const endIdx = i === k - 1 ? shuffled.length : (i + 1) * foldSize;
    
    const valData = shuffled.slice(startIdx, endIdx);
    const trainData = [
      ...shuffled.slice(0, startIdx),
      ...shuffled.slice(endIdx)
    ];
    
    folds.push({ trainData, valData });
  }
  
  return folds;
};

/**
 * Perform stratified k-fold cross-validation
 * Ensures each fold has similar class distribution
 */
export const createStratifiedKFolds = (
  data: TrainingExample[],
  k: number = 5
): CrossValidationFold[] => {
  // Group data by class
  const dataByClass: Record<string, TrainingExample[]> = {};
  
  data.forEach(example => {
    if (!dataByClass[example.label]) {
      dataByClass[example.label] = [];
    }
    dataByClass[example.label].push(example);
  });
  
  // Create empty folds
  const folds: TrainingExample[][] = Array(k).fill(null).map(() => []);
  
  // Distribute examples from each class into folds
  Object.values(dataByClass).forEach(classExamples => {
    // Shuffle examples of this class
    const shuffled = [...classExamples].sort(() => 0.5 - Math.random());
    
    // Distribute into folds
    shuffled.forEach((example, i) => {
      const foldIdx = i % k;
      folds[foldIdx].push(example);
    });
  });
  
  // Create validation folds
  const validationFolds: CrossValidationFold[] = [];
  
  for (let i = 0; i < k; i++) {
    const valData = folds[i];
    const trainData = folds.filter((_, idx) => idx !== i).flat();
    
    validationFolds.push({ trainData, valData });
  }
  
  return validationFolds;
};

/**
 * Perform k-fold cross-validation with a specified model
 */
export const performCrossValidation = async (
  data: TrainingExample[],
  hyperparameters: ModelHyperparameters,
  k: number = 5,
  stratified: boolean = true,
  onFoldComplete?: (fold: number, accuracy: number, loss: number) => void
): Promise<CrossValidationResult> => {
  // Create folds
  const folds = stratified 
    ? createStratifiedKFolds(data, k)
    : createKFolds(data, k);
  
  const foldAccuracies: number[] = [];
  const foldLosses: number[] = [];
  
  // Train and evaluate on each fold
  for (let i = 0; i < folds.length; i++) {
    const { trainData, valData } = folds[i];
    
    // Create and train model
    const model = createModelWithHyperparameters(hyperparameters);
    
    // Convert data to tensors
    const activities = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
    
    const trainLabels = trainData.map(example => {
      const index = activities.indexOf(example.label);
      const oneHot = new Array(activities.length).fill(0);
      oneHot[index] = 1;
      return oneHot;
    });
    
    const valLabels = valData.map(example => {
      const index = activities.indexOf(example.label);
      const oneHot = new Array(activities.length).fill(0);
      oneHot[index] = 1;
      return oneHot;
    });
    
    const xsTrain = tf.tensor3d(trainData.map(ex => ex.sensorData));
    const ysTrain = tf.tensor2d(trainLabels);
    
    const xsVal = tf.tensor3d(valData.map(ex => ex.sensorData));
    const ysVal = tf.tensor2d(valLabels);
    
    // Train model
    await model.fit(xsTrain, ysTrain, {
      epochs: hyperparameters.epochs,
      batchSize: hyperparameters.batchSize,
      verbose: 0
    });
    
    // Evaluate model
    const [loss, accuracy] = await model.evaluate(xsVal, ysVal, { verbose: 0 }) as tf.Scalar[];
    
    const accuracyValue = await accuracy.dataSync()[0];
    const lossValue = await loss.dataSync()[0];
    
    foldAccuracies.push(accuracyValue);
    foldLosses.push(lossValue);
    
    if (onFoldComplete) {
      onFoldComplete(i + 1, accuracyValue, lossValue);
    }
    
    // Clean up
    model.dispose();
    xsTrain.dispose();
    ysTrain.dispose();
    xsVal.dispose();
    ysVal.dispose();
    accuracy.dispose();
    loss.dispose();
  }
  
  // Calculate statistics
  const avgAccuracy = foldAccuracies.reduce((sum, acc) => sum + acc, 0) / k;
  const avgLoss = foldLosses.reduce((sum, loss) => sum + loss, 0) / k;
  
  const stdAccuracy = Math.sqrt(
    foldAccuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / k
  );
  
  const stdLoss = Math.sqrt(
    foldLosses.reduce((sum, loss) => sum + Math.pow(loss - avgLoss, 2), 0) / k
  );
  
  return {
    foldAccuracies,
    foldLosses,
    avgAccuracy,
    avgLoss,
    stdAccuracy,
    stdLoss
  };
};

/**
 * Perform repeated k-fold cross-validation
 * Repeats the process multiple times with different data splits
 */
export const repeatedCrossValidation = async (
  data: TrainingExample[],
  hyperparameters: ModelHyperparameters,
  k: number = 5,
  repetitions: number = 3,
  stratified: boolean = true,
  onRepetitionComplete?: (rep: number, result: CrossValidationResult) => void
): Promise<CrossValidationResult> => {
  const results: CrossValidationResult[] = [];
  
  for (let i = 0; i < repetitions; i++) {
    const result = await performCrossValidation(
      data,
      hyperparameters,
      k,
      stratified
    );
    
    results.push(result);
    
    if (onRepetitionComplete) {
      onRepetitionComplete(i + 1, result);
    }
  }
  
  // Calculate overall statistics
  const allAccuracies = results.flatMap(r => r.foldAccuracies);
  const allLosses = results.flatMap(r => r.foldLosses);
  
  const avgAccuracy = allAccuracies.reduce((sum, acc) => sum + acc, 0) / allAccuracies.length;
  const avgLoss = allLosses.reduce((sum, loss) => sum + loss, 0) / allLosses.length;
  
  const stdAccuracy = Math.sqrt(
    allAccuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / allAccuracies.length
  );
  
  const stdLoss = Math.sqrt(
    allLosses.reduce((sum, loss) => sum + Math.pow(loss - avgLoss, 2), 0) / allLosses.length
  );
  
  return {
    foldAccuracies: allAccuracies,
    foldLosses: allLosses,
    avgAccuracy,
    avgLoss,
    stdAccuracy,
    stdLoss
  };
};
