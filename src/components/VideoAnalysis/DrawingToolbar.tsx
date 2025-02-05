
import { Button } from "@/components/ui/button";
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  MousePointer, 
  Trash2,
  Target,
  Eye,
} from 'lucide-react';

interface DrawingToolbarProps {
  activeTool: 'select' | 'draw' | 'rectangle' | 'circle' | 'player-track' | 'yolo';
  isTracking: boolean;
  onToolClick: (tool: 'select' | 'draw' | 'rectangle' | 'circle' | 'player-track' | 'yolo') => void;
  onClear: () => void;
}

const DrawingToolbar = ({ 
  activeTool, 
  isTracking,
  onToolClick, 
  onClear 
}: DrawingToolbarProps) => {
  return (
    <div className="absolute top-4 left-4 z-50 bg-white/90 p-2 rounded-lg shadow-lg flex flex-col gap-2 border border-gray-200">
      <Button
        variant={activeTool === 'select' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('select')}
        title="Selection Tool"
      >
        <MousePointer className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'draw' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('draw')}
        title="Drawing Tool"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'rectangle' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('rectangle')}
        title="Rectangle Tool"
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'circle' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('circle')}
        title="Circle Tool"
      >
        <CircleIcon className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'player-track' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('player-track')}
        title="Player Tracking"
      >
        <Target className="h-4 w-4" />
      </Button>
      <Button
        variant={isTracking ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('yolo')}
        title="Object Detection"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onClear}
        title="Clear Canvas"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DrawingToolbar;
