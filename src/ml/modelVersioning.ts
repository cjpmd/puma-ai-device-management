
import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';

// Define interfaces for model versioning
export interface ModelVersion {
  id: string;
  version: string;
  accuracy: number;
  model_file_path?: string;
  parameters?: string; // Stored as JSON string in DB
  created_at: string;
  updated_at?: string;
}

/**
 * Save model weights as JSON format
 */
const serializeModelWeights = (model: tf.Sequential): string => {
  const weightData: any[] = [];
  const weights = model.getWeights();
  
  weights.forEach((tensor, idx) => {
    // Access the tensor's values as a typed array
    const values = tensor.dataSync();
    const shape = tensor.shape;
    
    weightData.push({
      weight_idx: idx,
      shape: shape,
      values: Array.from(values)
    });
  });
  
  return JSON.stringify(weightData);
};

/**
 * Load model weights from JSON format
 */
const deserializeModelWeights = async (
  model: tf.Sequential,
  serializedWeights: string
): Promise<tf.Sequential> => {
  try {
    const weightData = JSON.parse(serializedWeights);
    
    // Create tensors from the serialized weight data
    const tensors = weightData.map((item: any) => {
      return tf.tensor(item.values, item.shape);
    });
    
    // Set the weights on the model
    model.setWeights(tensors);
    
    return model;
  } catch (error) {
    console.error('Error deserializing model weights:', error);
    throw error;
  }
};

/**
 * Save a trained model to Supabase
 */
export const saveModelVersion = async (
  model: tf.Sequential,
  version: string,
  accuracy: number
): Promise<string> => {
  try {
    // Serialize the model weights
    const serializedWeights = serializeModelWeights(model);
    
    // Save the model in Supabase
    const { data, error } = await supabase
      .from('ml_models')
      .insert({
        version,
        accuracy,
        parameters: serializedWeights
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving model:', error);
      throw error;
    }
    
    console.log('Saved model version:', version, 'with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error in saveModelVersion:', error);
    throw error;
  }
};

/**
 * Load a model version from Supabase
 */
export const loadModelVersion = async (
  modelId: string
): Promise<tf.Sequential> => {
  try {
    // Get the model data from Supabase
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('id', modelId)
      .single();
    
    if (error) {
      console.error('Error loading model:', error);
      throw error;
    }
    
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
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    // Load the weights if available
    if (data.parameters) {
      await deserializeModelWeights(model, data.parameters.toString());
    }
    
    return model;
  } catch (error) {
    console.error('Error in loadModelVersion:', error);
    throw error;
  }
};

/**
 * Compare two model versions by performance
 */
export const compareModelVersions = async (
  modelId1: string,
  modelId2: string
): Promise<{
  modelId1: string;
  modelId2: string;
  accuracy1: number;
  accuracy2: number;
  improvement: number;
}> => {
  try {
    // Get the model data from Supabase
    const { data: models, error } = await supabase
      .from('ml_models')
      .select('*')
      .in('id', [modelId1, modelId2]);
    
    if (error) {
      console.error('Error loading models:', error);
      throw error;
    }
    
    if (!models || models.length !== 2) {
      throw new Error('Could not find the specified models');
    }
    
    const model1 = models.find(m => m.id === modelId1);
    const model2 = models.find(m => m.id === modelId2);
    
    if (!model1 || !model2) {
      throw new Error('Could not find one of the specified models');
    }
    
    const accuracy1 = model1.accuracy;
    const accuracy2 = model2.accuracy;
    const improvement = accuracy2 - accuracy1;
    
    return {
      modelId1,
      modelId2,
      accuracy1,
      accuracy2,
      improvement
    };
  } catch (error) {
    console.error('Error in compareModelVersions:', error);
    throw error;
  }
};

/**
 * Get all available model versions
 */
export const getAllModelVersions = async (): Promise<ModelVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading models:', error);
      throw error;
    }
    
    // Convert to ModelVersion type
    return (data || []) as ModelVersion[];
  } catch (error) {
    console.error('Error in getAllModelVersions:', error);
    return [];
  }
};

/**
 * Delete a model version
 */
export const deleteModelVersion = async (modelId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ml_models')
      .delete()
      .eq('id', modelId);
    
    if (error) {
      console.error('Error deleting model:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteModelVersion:', error);
    return false;
  }
};
