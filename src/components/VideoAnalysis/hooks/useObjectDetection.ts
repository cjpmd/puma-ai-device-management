
import { useState, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { useToast } from "@/components/ui/use-toast";

export const useObjectDetection = () => {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        toast({
          title: "YOLO Model Loaded",
          description: "Ready for object detection",
        });
      } catch (error) {
        console.error('Error loading model:', error);
        toast({
          title: "Error",
          description: "Failed to load YOLO model",
          variant: "destructive",
        });
      }
    };

    loadModel();
  }, []);

  return model;
};
