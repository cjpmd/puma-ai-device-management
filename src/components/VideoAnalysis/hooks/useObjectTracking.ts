
import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface TrackingResult {
  trackId: number;
  bbox: [number, number, number, number];
  class: string;
  confidence: number;
}

export const useObjectTracking = () => {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await cocoSsd.load({
          base: 'mobilenet_v2'
        });
        setModel(loadedModel);
        toast({
          title: "Tracking Model Loaded",
          description: "Ready for real-time player tracking",
        });
      } catch (error) {
        console.error('Error loading tracking model:', error);
        toast({
          title: "Error",
          description: "Failed to load tracking model",
          variant: "destructive",
        });
      }
    };

    loadModel();
  }, []);

  const saveTrackingResults = async (
    videoId: string,
    frameNumber: number,
    results: TrackingResult[]
  ) => {
    try {
      const { error } = await supabase
        .from('deep_tracking_results')
        .insert(
          results.map(result => ({
            video_id: videoId,
            frame_number: frameNumber,
            track_id: result.trackId,
            x_coord: result.bbox[0],
            y_coord: result.bbox[1],
            width: result.bbox[2],
            height: result.bbox[3],
            confidence: result.confidence,
            class_name: result.class
          }))
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error saving tracking results:', error);
      throw error;
    }
  };

  return {
    model,
    isTracking,
    setIsTracking,
    saveTrackingResults
  };
};
