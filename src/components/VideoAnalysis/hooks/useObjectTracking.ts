
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
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState<TrackingResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const loadedModel = await cocoSsd.load({
          base: 'mobilenet_v2'
        });
        setModel(loadedModel);
        toast({
          title: "Tracking Model Loaded",
          description: "Ready for real-time object tracking",
        });
      } catch (error) {
        console.error('Error loading tracking model:', error);
        toast({
          title: "Error",
          description: "Failed to load tracking model",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, []);

  const trackFrame = async (videoElement: HTMLVideoElement | HTMLCanvasElement) => {
    if (!model || !isTracking) return null;
    
    try {
      // Run object detection on the current frame
      const predictions = await model.detect(videoElement);
      
      // Convert predictions to tracking results
      const results: TrackingResult[] = predictions.map((pred, index) => ({
        trackId: index,  // In a real system we would use a tracker to maintain IDs across frames
        bbox: [
          pred.bbox[0],
          pred.bbox[1],
          pred.bbox[2],
          pred.bbox[3]
        ] as [number, number, number, number],
        class: pred.class,
        confidence: pred.score
      }));
      
      // Update the tracks state
      setTracks(results);
      
      return results;
    } catch (error) {
      console.error('Error tracking objects:', error);
      return null;
    }
  };

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
      return true;
    } catch (error) {
      console.error('Error saving tracking results:', error);
      throw error;
    }
  };

  return {
    model,
    isTracking,
    setIsTracking,
    isLoading,
    tracks,
    trackFrame,
    saveTrackingResults
  };
};
