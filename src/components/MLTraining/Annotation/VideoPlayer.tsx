
import { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ActivityType } from '@/ml/activityRecognition';

interface VideoPlayerProps {
  localVideoPath: string;
  currentLabel: ActivityType;
  onAnnotationAdd: (annotation: { startTime: number; endTime: number; activityType: ActivityType }) => void;
}

const VideoPlayer = ({ localVideoPath, currentLabel, onAnnotationAdd }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const handleAddAnnotation = () => {
    if (!videoRef.current) return;
    
    const newAnnotation = {
      startTime: videoRef.current.currentTime * 1000, // Convert to milliseconds
      endTime: (videoRef.current.currentTime + 2) * 1000, // Default 2 second duration
      activityType: currentLabel
    };
    
    onAnnotationAdd(newAnnotation);
    
    toast({
      title: "Annotation added",
      description: `Added ${currentLabel} annotation at ${videoRef.current.currentTime.toFixed(2)}s`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <video 
          ref={videoRef}
          src={localVideoPath} 
          controls 
          className="w-full h-auto rounded-md"
        />
      </div>
      <Button onClick={handleAddAnnotation}>
        <Plus className="mr-2 h-4 w-4" />
        Add Annotation at Current Time
      </Button>
    </div>
  );
};

export default VideoPlayer;
