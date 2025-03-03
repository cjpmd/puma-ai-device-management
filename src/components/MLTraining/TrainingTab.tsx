
import { Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ActivityType, TrainingExample } from '@/ml/activityRecognition';

interface TrainingTabProps {
  trainingData: TrainingExample[];
  onStartTraining: () => void;
}

const TrainingTab = ({ trainingData, onStartTraining }: TrainingTabProps) => {
  // Group training examples by activity type
  const activityTypes: ActivityType[] = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Training Data Summary</h3>
        <div className="grid grid-cols-5 gap-2">
          {activityTypes.map((activity) => (
            <div key={activity} className="text-center p-2 bg-gray-100 rounded-md">
              <div className="font-medium capitalize">{activity.replace('_', ' ')}</div>
              <div className="text-2xl">
                {trainingData.filter(d => d.label === activity).length}
              </div>
              <div className="text-xs text-muted-foreground">examples</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="pt-4">
        <Button
          onClick={onStartTraining}
          disabled={trainingData.length < 1000}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Start Training ({trainingData.length} examples collected)
        </Button>
      </div>
    </div>
  );
};

export default TrainingTab;
