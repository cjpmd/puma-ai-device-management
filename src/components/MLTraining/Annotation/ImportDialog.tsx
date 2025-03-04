
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ActivityType } from '@/ml/activityRecognition';

interface Annotation {
  startTime: number;
  endTime: number;
  activityType: ActivityType;
  sensorData?: number[][];
}

interface ImportDialogProps {
  onAnnotationsImport: (annotations: Annotation[]) => void;
}

const ImportDialog = ({ onAnnotationsImport }: ImportDialogProps) => {
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [viaJsonContent, setViaJsonContent] = useState('');
  const { toast } = useToast();

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

  return (
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
  );
};

export default ImportDialog;
