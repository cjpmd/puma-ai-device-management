
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
    <div className="absolute top-4 left-4 flex flex-col gap-2">
      <Button
        variant={activeTool === 'select' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('select')}
      >
        <MousePointer className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'draw' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('draw')}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'rectangle' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('rectangle')}
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'circle' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('circle')}
      >
        <CircleIcon className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === 'player-track' ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('player-track')}
      >
        <Target className="h-4 w-4" />
      </Button>
      <Button
        variant={isTracking ? 'default' : 'outline'}
        size="icon"
        onClick={() => onToolClick('yolo')}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onClear}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DrawingToolbar;
