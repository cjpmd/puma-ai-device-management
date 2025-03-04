
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { ActivityType } from '@/ml/activityRecognition';
import ActivityTypeSelector from './Annotation/ActivityTypeSelector';
import VideoPlayer from './Annotation/VideoPlayer';
import AnnotationList from './Annotation/AnnotationList';
import ImportDialog from './Annotation/ImportDialog';
import EmptyState from './Annotation/EmptyState';

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
  if (!localVideoPath) {
    return <EmptyState message="Upload a video first to add annotations" />;
  }

  return (
    <div className="space-y-4">
      <VideoPlayer
        localVideoPath={localVideoPath}
        currentLabel={currentLabel}
        onAnnotationAdd={onAnnotationAdd}
      />
      
      <ActivityTypeSelector 
        currentLabel={currentLabel}
        onLabelChange={onLabelChange}
      />
      
      <div className="flex gap-4">
        <ImportDialog onAnnotationsImport={onAnnotationsImport} />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Current Annotations</h3>
        <AnnotationList annotations={annotations} />
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
