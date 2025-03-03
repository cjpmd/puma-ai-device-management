
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Save } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ActivityType } from '@/ml/activityRecognition';

interface Annotation {
  startTime: number;
  endTime: number;
  activityType: ActivityType;
  sensorData?: number[][];
}

interface AnnotationTabProps {
  localVideoPath: string | null;
  annotations: Annotation[];
  currentLabel: ActivityType;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationsImport: (annotations: Annotation[]) => void;
  onLabelChange: (label: ActivityType) => void;
  onProcessAnnotations: () => void;
  hasRawSensorData: boolean;
}

const AnnotationTab = ({
  localVideoPath,
  annotations,
  currentLabel,
  onAnnotationAdd,
  onAnnotationsImport,
  onLabelChange,
  onProcessAnnotations,
  hasRawSensorData
}: AnnotationTabProps) => {
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [viaJsonContent, setViaJsonContent] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const handleAddAnnotation = () => {
    if (!videoRef.current) return;
    
    const newAnnotation: Annotation = {
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

  const parseViaAnnotations = () => {
    try {
      // Parse the VIA JSON format
      const viaData = JSON.parse(viaJsonContent);
      const newAnnotations: Annotation[] = [];
      
      // VIA stores data in format: {"filename": {"metadata": {"vid_1": {"z":[0,2.3],"xy":[],"av":{"1":"pass"}}}}}
      Object.values(viaData).forEach((fileData: any) => {
        if (fileData.metadata) {
          Object.values(fileData.metadata).forEach((segment: any) => {
            if (segment.z && segment.z.length === 2 && segment.av) {
              const activityValue = Object.values(segment.av)[0] as string;
              const validActivityTypes: ActivityType[] = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
              const activityType = validActivityTypes.includes(activityValue as ActivityType) 
                ? activityValue as ActivityType 
                : 'pass';
              
              newAnnotations.push({
                startTime: segment.z[0] * 1000, // Convert to milliseconds
                endTime: segment.z[1] * 1000,
                activityType: activityType
              });
            }
          });
        }
      });
      
      onAnnotationsImport(newAnnotations);
      setShowAnnotationDialog(false);
      
      toast({
        title: "Annotations imported",
        description: `Successfully imported ${newAnnotations.length} annotations from VIA`,
      });
    } catch (error) {
      console.error('Error parsing VIA annotations:', error);
      toast({
        title: "Error",
        description: "Failed to parse VIA annotations. Check the JSON format.",
        variant: "destructive",
      });
    }
  };

  if (!localVideoPath) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-lg">
        <p className="text-gray-500">Upload a video first to add annotations</p>
      </div>
    );
  }

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
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Activity Type</h3>
        <RadioGroup
          value={currentLabel}
          onValueChange={(value: ActivityType) => onLabelChange(value)}
          className="flex flex-wrap gap-4"
        >
          {['pass', 'shot', 'dribble', 'touch', 'no_possession'].map((activity) => (
            <div key={activity} className="flex items-center space-x-2">
              <RadioGroupItem value={activity} id={activity} />
              <Label htmlFor={activity}>{activity.replace('_', ' ')}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      
      <div className="flex gap-4">
        <Button onClick={handleAddAnnotation}>
          <Plus className="mr-2 h-4 w-4" />
          Add Annotation at Current Time
        </Button>
        
        <Dialog open={showAnnotationDialog} onOpenChange={setShowAnnotationDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">Import VIA Annotations</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Import VIA JSON Annotations</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea
                placeholder="Paste your VIA JSON export here..."
                value={viaJsonContent}
                onChange={(e) => setViaJsonContent(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
            <DialogFooter>
              <Button type="submit" onClick={parseViaAnnotations}>Import</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Current Annotations</h3>
        {annotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No annotations added yet</p>
        ) : (
          <div className="border rounded-md divide-y">
            {annotations.map((annotation, index) => (
              <div key={index} className="p-2 flex justify-between items-center">
                <div>
                  <span className="font-medium">{annotation.activityType}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {(annotation.startTime / 1000).toFixed(2)}s - {(annotation.endTime / 1000).toFixed(2)}s
                  </span>
                </div>
                <span className="text-sm">
                  {((annotation.endTime - annotation.startTime) / 1000).toFixed(2)}s duration
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Button 
        onClick={onProcessAnnotations}
        disabled={!hasRawSensorData || annotations.length === 0}
      >
        <Save className="mr-2 h-4 w-4" />
        Process Annotations into Training Data
      </Button>
    </div>
  );
};

export default AnnotationTab;
