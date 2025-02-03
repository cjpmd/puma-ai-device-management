import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Line, Rect, PencilBrush } from 'fabric';
import { Button } from "@/components/ui/button";
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  MousePointer, 
  Trash2 
} from 'lucide-react';

interface DrawingCanvasProps {
  width: number;
  height: number;
  onAnnotationChange?: (annotations: any) => void;
}

const DrawingCanvas = ({ width, height, onAnnotationChange }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'rectangle' | 'circle'>('select');

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'transparent',
      isDrawingMode: false
    });

    // Initialize the free drawing brush
    if (!fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
    }

    // Set brush properties
    fabricCanvas.freeDrawingBrush.color = '#ff0000';
    fabricCanvas.freeDrawingBrush.width = 2;

    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'draw';
    
    if (activeTool === 'draw' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = '#ff0000';
      canvas.freeDrawingBrush.width = 2;
    }
  }, [activeTool, canvas]);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);

    if (!canvas) return;

    if (tool === 'rectangle') {
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
    } else if (tool === 'circle') {
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