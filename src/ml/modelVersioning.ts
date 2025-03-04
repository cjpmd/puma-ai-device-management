
import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/integrations/supabase/client';

export interface ModelVersion {
  id: string;
  version: string;
  accuracy: number;
  parameters?: string; // Store as JSON string
  created_at: string;
  updated_at: string;
}

/**
 * Serialize model weights to a format that can be stored
 */
export const serializeModel = async (model: tf.Sequential): Promise<any> => {
  // Get weights as tensors
  const weights = model.getWeights();
  const serializedWeights = await Promise.all(
    weights.map(async (w) => {
      const tensorData = await w.data();
      // Get layer name from tensor's description or use a default
      const layerName = w.name || 'unnamed';
      return {
        name: layerName,
        data: Array.from(tensorData),
        shape: w.shape
      };
    })
  );
  
  return serializedWeights;
};

/**
 * Deserialize model weights from stored format
 */
export const deserializeModel = async (
  architecture: any,
  serializedWeights: any[]
): Promise<tf.Sequential> => {
  // Create model from architecture
  const model = tf.sequential();
  
  // If we have a full architecture definition
  if (architecture && architecture.config && architecture.config.layers) {
    // Recreation using tf.sequential()
    for (const layer of architecture.config.layers) {
      if (layer.config) {
        const layerConfig: any = {
          units: layer.config.units,
          activation: layer.config.activation,
          inputShape: layer.config.batch_input_shape ? 
            layer.config.batch_input_shape.slice(1) : undefined
        };
        
        if (layer.class_name === 'Dense') {
          model.add(tf.layers.dense(layerConfig));
        } else if (layer.class_name === 'LSTM') {
          model.add(tf.layers.lstm({
            ...layerConfig,
            returnSequences: layer.config.return_sequences === 'true' || layer.config.return_sequences === true
          }));
        } else if (layer.class_name === 'Dropout') {
          model.add(tf.layers.dropout({
            rate: Number(layer.config.rate)
          }));
        }
      }
    }
  }
  
  // Set the weights
  const weights = serializedWeights.map((w) => {
    return tf.tensor(w.data, w.shape);
  });
  
  model.setWeights(weights);
  
  // Compile with sensible defaults if not specified
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

/**
 * Save model to Supabase
 */
export const saveModelVersion = async (
  model: tf.Sequential,
  version: string,
  accuracy: number
): Promise<string | null> => {
  try {
    const serializedWeights = await serializeModel(model);
    
    const { data, error } = await supabase
      .from('ml_models')
      .insert({
        version,
        accuracy,
        parameters: JSON.stringify(serializedWeights),
        training_date: new Date().toISOString()
      })
      .select();
    
    if (error || !data || data.length === 0) {
      console.error('Error saving model:', error);
      return null;
    }
    
    return data[0].id;
  } catch (error) {
    console.error('Error serializing model:', error);
    return null;
  }
};

/**
 * Load model from Supabase
 */
export const loadModelVersion = async (
  modelId: string
): Promise<tf.Sequential | null> => {
  try {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('id', modelId)
      .single();
    
    if (error || !data) {
      console.error('Error loading model:', error);
      return null;
    }
    
    // Parse parameters JSON
    let parameters;
    try {
      parameters = JSON.parse(data.parameters as string);
    } catch (e) {
      console.error('Error parsing model parameters:', e);
      return null;
    }
    
    // Create a default architecture if missing
    const defaultArchitecture = {
      config: {
        layers: [
          {
            class_name: 'LSTM',
            config: {
              units: 64,
              batch_input_shape: [null, null, 4],
              activation: 'tanh',
              return_sequences: true
            }
          },
          {
            class_name: 'Dropout',
            config: {
              rate: 0.2
            }
          },
          {
            class_name: 'LSTM',
            config: {
              units: 32,
              return_sequences: false,
              activation: 'tanh'
            }
          },
          {
            class_name: 'Dense',
            config: {
              units: 5,
              activation: 'softmax'
            }
          }
        ]
      }
    };
    
    return await deserializeModel(defaultArchitecture, parameters);
  } catch (error) {
    console.error('Error deserializing model:', error);
    return null;
  }
};

/**
 * Get all model versions
 */
export const getAllModelVersions = async (): Promise<ModelVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error || !data) {
      console.error('Error fetching model versions:', error);
      return [];
    }
    
    // Convert data to ModelVersion type
    return data.map(item => ({
      id: item.id,
      version: item.version,
      accuracy: item.accuracy,
      parameters: item.parameters as string,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  } catch (error) {
    console.error('Error fetching model versions:', error);
    return [];
  }
};
