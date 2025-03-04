
import { Json } from '@/integrations/supabase/types';
import * as tf from '@tensorflow/tfjs';

export interface MLTrainingSession {
  id?: string;
  activity_type: string; // Make this required to match Supabase requirements
  created_at?: string;
  updated_at?: string;
  device_id?: number;
  video_timestamp?: number;
  player_id?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  parameters?: string; // To store training data as JSON string
}

export interface ModelVersion {
  id: string;
  version: string;
  accuracy: number;
  parameters: string; // Store parameters as a JSON string
  created_at: string;
  updated_at: string;
  training_date: string;
  model_file_path?: string;
}

export type SessionData = {
  id: string;
  activity_type: string;
  created_at: string;
  updated_at: string;
  device_id: number;
  video_timestamp: number;
  player_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  parameters?: string;
  video_id?: string;
};

export interface WeightsManifestEntry {
  name: string;
  shape: number[];
  dtype: string;
}

// Type helper for TensorFlow activation functions
export type ActivationIdentifier = 
  'elu' | 'hardSigmoid' | 'linear' | 'relu' | 'relu6' | 
  'selu' | 'sigmoid' | 'softmax' | 'softplus' | 'softsign' | 
  'tanh' | 'swish' | 'mish';
