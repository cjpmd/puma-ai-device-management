
import { useState, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { useToast } from "@/components/ui/use-toast";

export const useObjectDetection = () => {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        toast({
          title: "Object Detection Model Loaded",
          description: "Ready for video analysis",
        });
      } catch (error) {
        console.error('Error loading model:', error);
        toast({
          title: "Error",
          description: "Failed to load object detection model",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, []);

  // Function to detect objects in a video frame
  const detectObjects = async (video: HTMLVideoElement | HTMLCanvasElement): Promise<cocoSsd.DetectedObject[] | null> => {
    if (!model) return null;
    
    try {
      const predictions = await model.detect(video);
      return predictions;
    } catch (error) {
      console.error('Error detecting objects:', error);
      return null;
    }
  };

  return { model, isLoading, detectObjects };
};
