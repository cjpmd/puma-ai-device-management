
import { useState, useEffect, useRef } from 'react';
import { pipeline } from '@huggingface/transformers';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface DetectedPlayer {
  id: number;
  shirtNumber?: number;
  name?: string;
  position?: string;
  bbox: [number, number, number, number]; // [x, y, width, height]
  confidence: number;
  biometrics?: {
    heartRate?: number;
    speed?: number;
    distance?: number;
  };
}

export const useAugmentedReality = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedPlayers, setDetectedPlayers] = useState<DetectedPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<any>(null);
  const { toast } = useToast();
  
  // Initialize the object detection model
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        setIsProcessing(true);
        
        // Load the object detection model from Hugging Face
        const detector = await pipeline(
          'object-detection',
          'Xenova/detr-resnet-50',
          { device: 'wasm' } 
        );
        
        detectorRef.current = detector;
        setIsInitialized(true);
        
        toast({
          title: "AR System Initialized",
          description: "Player detection system is ready",
        });
      } catch (err) {
        console.error("Error initializing AR system:", err);
        setError("Failed to load detection model");
        
        toast({
          title: "Initialization Error",
          description: "Failed to load AR detection system",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    initializeDetector();
    
    return () => {
      // Clean up any resources if needed
      detectorRef.current = null;
    };
  }, []);
  
  // Detect players in the provided frame
  const detectPlayers = async (frame: HTMLCanvasElement | ImageBitmap) => {
    if (!detectorRef.current) {
      setError("Detection model not initialized");
      return [];
    }
    
    try {
      setIsProcessing(true);
      
      // Convert canvas element to base64 URL for Hugging Face pipeline
      let imageData;
      
      if (frame instanceof HTMLCanvasElement) {
        // For canvas elements, get the data URL
        imageData = frame.toDataURL('image/jpeg');
      } else if (frame instanceof ImageBitmap) {
        // For ImageBitmap, we need to draw it to a temporary canvas first
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frame.width;
        tempCanvas.height = frame.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(frame, 0, 0);
          imageData = tempCanvas.toDataURL('image/jpeg');
        } else {
          throw new Error("Could not create temporary context for ImageBitmap");
        }
      } else {
        throw new Error("Unsupported frame type");
      }
      
      // Run object detection on the image data
      const results = await detectorRef.current(imageData);
      
      // Filter for person detections and format as DetectedPlayer objects
      const playerDetections = results
        .filter((item: any) => item.label === 'person')
        .map((item: any, index: number) => {
          return {
            id: index,
            bbox: [
              item.box.xmin, 
              item.box.ymin, 
              item.box.xmax - item.box.xmin, 
              item.box.ymax - item.box.ymin
            ] as [number, number, number, number],
            confidence: item.score,
            // Shirt number detection would be added here in a production system
            // For now we'll simulate it with random numbers
            shirtNumber: Math.floor(Math.random() * 20) + 1
          };
        });
      
      // Fetch player data based on detected shirt numbers
      const enhancedPlayers = await enrichPlayerData(playerDetections);
      
      setDetectedPlayers(enhancedPlayers);
      return enhancedPlayers;
    } catch (err) {
      console.error("Error detecting players:", err);
      setError("Failed to detect players in frame");
      return [];
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Enrich player detections with data from the database
  const enrichPlayerData = async (detections: DetectedPlayer[]) => {
    try {
      // Process each detection to find matching players by squad number
      const enhanced = await Promise.all(
        detections.map(async (player) => {
          if (!player.shirtNumber) return player;
          
          // Try to fetch real player data based on squad number
          const { data, error } = await supabase
            .from('players')
            .select('id, name, player_type, squad_number')
            .eq('squad_number', player.shirtNumber)
            .limit(1)
            .single();
            
          if (error || !data) {
            // Fallback to simulated data
            return {
              ...player,
              name: `Player ${player.shirtNumber}`,
              position: ['GK', 'DF', 'MF', 'FW'][Math.floor(Math.random() * 4)],
              biometrics: {
                heartRate: Math.floor(Math.random() * 40) + 140, // 140-180 bpm
                speed: +(Math.random() * 8 + 2).toFixed(1), // 2-10 m/s
                distance: +(Math.random() * 3).toFixed(2), // 0-3 km
              }
            };
          }
          
          // Get biometric data
          const { data: biometricData } = await supabase
            .from('sensor_recordings')
            .select('x, y, z')
            .order('created_at', { ascending: false })
            .limit(1);
            
          const heartRate = Math.floor(Math.random() * 40) + 140; // Simulated for now
            
          return {
            ...player,
            name: data.name,
            shirtNumber: data.squad_number, // Add squad number from database
            position: data.player_type === 'GOALKEEPER' ? 'GK' : ['DF', 'MF', 'FW'][Math.floor(Math.random() * 3)],
            biometrics: {
              heartRate,
              speed: biometricData?.length ? Math.sqrt(Math.pow(Number(biometricData[0].x), 2) + 
                Math.pow(Number(biometricData[0].y), 2) + 
                Math.pow(Number(biometricData[0].z), 2)) : 
                +(Math.random() * 8 + 2).toFixed(1),
              distance: +(Math.random() * 3).toFixed(2), // Simulated for now
            }
          };
        })
      );
      
      return enhanced;
    } catch (err) {
      console.error("Error enriching player data:", err);
      return detections;
    }
  };

  return {
    isInitialized,
    isProcessing,
    detectedPlayers,
    error,
    detectPlayers
  };
};
