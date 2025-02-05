
import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, PencilBrush, Text, Object as FabricObject } from 'fabric';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DrawingToolbar from './DrawingToolbar';
import { useObjectDetection } from './hooks/useObjectDetection';
import { storeDetection } from './services/detectionService';

interface DrawingCanvasProps {
  width: number;
  height: number;
  videoId?: string;
  currentTime?: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onAnnotationChange?: (annotations: any) => void;
}

interface CustomFabricObject extends FabricObject {
  data?: {
    type: string;
  };
}

const DrawingCanvas = ({ 
  width, 
  height, 
  videoId,
  currentTime,
  videoRef,
  onAnnotationChange 
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'rectangle' | 'circle' | 'player-track' | 'yolo'>('select');
  const [isTracking, setIsTracking] = useState(false);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();
  const model = useObjectDetection();

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'transparent',
      isDrawingMode: false
    });

    fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.width = 2;
    fabricCanvas.freeDrawingBrush.color = '#ff0000';

    setCanvas(fabricCanvas);

    // Create detection canvas
    const detectionCanvas = document.createElement('canvas');
    detectionCanvas.width = width;
    detectionCanvas.height = height;
    detectionCanvasRef.current = detectionCanvas;

    return () => {
      fabricCanvas.dispose();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (!canvas) return;
    canvas.isDrawingMode = activeTool === 'draw';
  }, [activeTool, canvas]);

  const detectObjects = async () => {
    if (!model || !videoRef?.current || !detectionCanvasRef.current || !canvas) return;

    const video = videoRef.current;
    const detectionCanvas = detectionCanvasRef.current;
    const ctx = detectionCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    try {
      const predictions = await model.detect(detectionCanvas);

      // Clear previous detections
      const objects = canvas.getObjects() as CustomFabricObject[];
      objects.forEach(obj => {
        if (obj.data?.type === 'detection') {
          canvas.remove(obj);
        }
      });

      // Draw new detections
      for (const prediction of predictions) {
        const [x, y, boxWidth, boxHeight] = prediction.bbox;
        
        const rect = new Rect({
          left: x,
          top: y,
          width: boxWidth,
          height: boxHeight,
          fill: 'transparent',
          stroke: '#00ff00',
          strokeWidth: 2,
          selectable: false,
          data: { type: 'detection' }
        });

        const text = new Text(
          `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
          {
            left: x,
            top: y - 20,
            fontSize: 16,
            fill: '#00ff00',
            backgroundColor: 'rgba(0,0,0,0.5)',
            selectable: false,
            data: { type: 'detection' }
          }
        );

        canvas.add(rect, text);

        if (videoId && video.currentTime) {
          try {
            await storeDetection(videoId, video.currentTime, prediction, { width, height });
          } catch (error) {
            console.error('Error storing detection:', error);
            toast({
              title: "Error",
              description: "Failed to store object detection",
              variant: "destructive",
            });
          }
        }
      }

      canvas.renderAll();

      if (isTracking) {
        animationFrameRef.current = requestAnimationFrame(detectObjects);
      }
    } catch (error) {
      console.error('Error during object detection:', error);
      toast({
        title: "Error",
        description: "Failed to process object detection",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (onAnnotationChange && canvas) {
      const handleObjectChange = () => {
        onAnnotationChange(canvas.getObjects());
      };

      canvas.on('object:added', handleObjectChange);
      canvas.on('object:removed', handleObjectChange);
      canvas.on('object:modified', handleObjectChange);

      return () => {
        canvas.off('object:added', handleObjectChange);
        canvas.off('object:removed', handleObjectChange);
        canvas.off('object:modified', handleObjectChange);
      };
    }
  }, [canvas, onAnnotationChange]);

  const handleToolClick = async (tool: typeof activeTool) => {
    setActiveTool(tool);

    if (tool === 'yolo') {
      if (!model) {
        toast({
          title: "Model not ready",
          description: "Please wait for the YOLO model to load",
          variant: "destructive",
        });
        return;
      }

      setIsTracking(!isTracking);
      if (!isTracking) {
        detectObjects();
        toast({
          title: "Detection Started",
          description: "Real-time object detection is now active",
        });
      } else {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        toast({
          title: "Detection Stopped",
          description: "Object detection has been stopped",
        });
      }
      return;
    }

    if (!canvas) return;

    switch (tool) {
      case 'rectangle':
        const rect = new Rect({
          left: 100,
          top: 100,
          fill: 'transparent',
          stroke: '#ff0000',
          strokeWidth: 2,
          width: 100,
          height: 100,
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        break;

      case 'circle':
        const circle = new Circle({
          left: 100,
          top: 100,
          fill: 'transparent',
          stroke: '#ff0000',
          strokeWidth: 2,
          radius: 50,
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
        break;

      case 'player-track':
        if (!videoId || !currentTime) {
          toast({
            title: "Error",
            description: "Please load a video first",
            variant: "destructive",
          });
          return;
        }

        try {
          const { error } = await supabase.functions.invoke('process-video', {
            body: {
              videoId,
              frameNumber: Math.floor(currentTime * 30),
              playerIds: ['mock-player-1', 'mock-player-2']
            }
          });

          if (error) throw error;

          toast({
            title: "Player Tracking",
            description: "Processing frame for player tracking...",
          });

          const { data: trackingData, error: fetchError } = await supabase
            .from('player_tracking')
            .select('*')
            .eq('video_id', videoId)
            .eq('frame_number', Math.floor(currentTime * 30));

          if (fetchError) throw fetchError;

          trackingData?.forEach(track => {
            const marker = new Circle({
              left: track.x_coord * width / 100,
              top: track.y_coord * height / 100,
              fill: 'rgba(255, 0, 0, 0.5)',
              radius: 10,
              selectable: false
            });
            canvas.add(marker);
          });

          canvas.renderAll();
        } catch (error) {
          console.error('Error processing video:', error);
          toast({
            title: "Error",
            description: "Failed to process video frame",
            variant: "destructive",
          });
        }
        break;
    }
  };

  const handleClear = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();
  };

  return (
    <div className="relative">
      <DrawingToolbar 
        activeTool={activeTool}
        isTracking={isTracking}
        onToolClick={handleToolClick}
        onClear={handleClear}
      />
      <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-auto" />
    </div>
  );
};

export default DrawingCanvas;
