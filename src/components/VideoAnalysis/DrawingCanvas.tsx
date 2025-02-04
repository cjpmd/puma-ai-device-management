import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, PencilBrush } from 'fabric';
import { Button } from "@/components/ui/button";
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  MousePointer, 
  Trash2,
  UserSquare2,
  Target,
  Eye,
  Play,
  Pause
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface DrawingCanvasProps {
  width: number;
  height: number;
  videoId?: string;
  currentTime?: number;
  onAnnotationChange?: (annotations: any) => void;
}

const DrawingCanvas = ({ 
  width, 
  height, 
  videoId,
  currentTime,
  onAnnotationChange 
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'rectangle' | 'circle' | 'player-track' | 'yolo'>('select');
  const [isTracking, setIsTracking] = useState(false);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const { toast } = useToast();

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

    // Load COCO-SSD model
    const loadModel = async () => {
      try {
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        toast({
          title: "YOLO Model Loaded",
          description: "Ready for player detection",
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

    return () => {
      fabricCanvas.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!canvas) return;
    canvas.isDrawingMode = activeTool === 'draw';
  }, [activeTool, canvas]);

  const handleToolClick = async (tool: typeof activeTool) => {
    setActiveTool(tool);

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

      case 'yolo':
        if (!model) {
          toast({
            title: "Model not ready",
            description: "Please wait for the YOLO model to load",
            variant: "destructive",
          });
          return;
        }
        setIsTracking(!isTracking);
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
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <Button
          variant={activeTool === 'select' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleToolClick('select')}
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'draw' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleToolClick('draw')}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'rectangle' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleToolClick('rectangle')}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'circle' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleToolClick('circle')}
        >
          <CircleIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'player-track' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleToolClick('player-track')}
        >
          <Target className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'yolo' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleToolClick('yolo')}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleClear}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-auto" />
    </div>
  );
};

export default DrawingCanvas;