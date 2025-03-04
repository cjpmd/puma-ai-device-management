
interface Annotation {
  startTime: number;
  endTime: number;
  activityType: string;
  sensorData?: number[][];
}

interface AnnotationListProps {
  annotations: Annotation[];
}

const AnnotationList = ({ annotations }: AnnotationListProps) => {
  if (annotations.length === 0) {
    return <p className="text-sm text-muted-foreground">No annotations added yet</p>;
  }

  return (
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
  );
};

export default AnnotationList;
