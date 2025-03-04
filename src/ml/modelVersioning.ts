
import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';
import { TrainingExample } from './activityRecognition';

export interface ModelVersion {
  id: string;
  version: string;
  accuracy: number;
  trainingDate: string;
  parameters?: any;
}

/**
 * Save a trained model to Supabase
 */
export const saveModel = async (
  model: tf.Sequential,
  version: string,
  accuracy: number,
  trainingExamples: number
): Promise<string | null> => {
  try {
    // Serialize model weights
    const weights = await Promise.all(
      model.getWeights().map(async (w) => {
        return {
          name: w.name,
          data: Array.from(await w.data()),
          shape: w.shape
        };
      })
    );
    
    // Save model to Supabase
    const { data, error } = await supabase
      .from('ml_models')
      .insert({
        version: version,
        accuracy: accuracy,
        parameters: JSON.stringify(weights),
        training_date: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving model:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error serializing model:', error);
    return null;
  }
};

/**
 * Load a model from Supabase by ID
 */
export const loadModel = async (modelId: string): Promise<tf.Sequential | null> => {
  try {
    // Fetch model data from Supabase
    const { data, error } = await supabase
      .from('ml_models')
      .select('parameters')
      .eq('id', modelId)
      .single();
    
    if (error || !data) {
      console.error('Error loading model:', error);
      return null;
    }
    
    const weights = JSON.parse(data.parameters);
    
    // Create a new model with the same architecture
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
    
    // Compile the model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    // Load weights into the model
    const tensors = weights.map((w: any) => 
      tf.tensor(w.data, w.shape, 'float32')
    );
    
    model.setWeights(tensors);
    
    return model;
  } catch (error) {
    console.error('Error loading model:', error);
    return null;
  }
};

/**
 * Get all saved model versions
 */
export const getModelVersions = async (): Promise<ModelVersion[]> => {
  const { data, error } = await supabase
    .from('ml_models')
    .select('id, version, accuracy, training_date')
    .order('training_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching model versions:', error);
    return [];
  }
  
  return data.map(m => ({
    id: m.id,
    version: m.version,
    accuracy: m.accuracy,
    trainingDate: m.training_date
  }));
};

/**
 * Compare two models' performance on a test dataset
 */
export const compareModels = async (
  modelA: tf.Sequential,
  modelB: tf.Sequential,
  testData: TrainingExample[]
): Promise<{
  modelAAccuracy: number;
  modelBAccuracy: number;
  comparisonMetrics: Record<string, any>;
}> => {
  // Convert test data to tensors
  const activities = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
  const oneHotLabels = testData.map(example => {
    const index = activities.indexOf(example.label);
    const oneHot = new Array(activities.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const xs = tf.tensor3d(testData.map(ex => ex.sensorData));
  const ys = tf.tensor2d(oneHotLabels);
  
  // Evaluate both models
  const evalA = await modelA.evaluate(xs, ys) as tf.Tensor[];
  const evalB = await modelB.evaluate(xs, ys) as tf.Tensor[];
  
  const modelAAccuracy = (await evalA[1].data())[0];
  const modelBAccuracy = (await evalB[1].data())[0];
  
  // Calculate predictions for confusion matrix
  const predictionsA = modelA.predict(xs) as tf.Tensor;
  const predictionsB = modelB.predict(xs) as tf.Tensor;
  
  const predA = await predictionsA.argMax(1).array() as number[];
  const predB = await predictionsB.argMax(1).array() as number[];
  const actual = await ys.argMax(1).array() as number[];
  
  // Calculate confusion matrices
  const confusionMatrixA = calculateConfusionMatrix(actual, predA, activities.length);
  const confusionMatrixB = calculateConfusionMatrix(actual, predB, activities.length);
  
  // Clean up tensors
  xs.dispose();
  ys.dispose();
  predictionsA.dispose();
  predictionsB.dispose();
  evalA.forEach(t => t.dispose());
  evalB.forEach(t => t.dispose());
  
  return {
    modelAAccuracy,
    modelBAccuracy,
    comparisonMetrics: {
      confusionMatrixA,
      confusionMatrixB,
      activities
    }
  };
};

/**
 * Calculate confusion matrix from predictions and actual values
 */
const calculateConfusionMatrix = (
  actual: number[], 
  predicted: number[], 
  numClasses: number
): number[][] => {
  const matrix = Array(numClasses).fill(0).map(() => Array(numClasses).fill(0));
  
  for (let i = 0; i < actual.length; i++) {
    matrix[actual[i]][predicted[i]]++;
  }
  
  return matrix;
};
