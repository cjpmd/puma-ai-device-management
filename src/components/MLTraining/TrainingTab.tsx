
import { Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ActivityType, TrainingExample } from '@/ml/activityRecognition';
import { Progress } from "@/components/ui/progress";
import { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from 'lucide-react';

interface TrainingTabProps {
  trainingData: TrainingExample[];
  onStartTraining: () => void;
}

const TrainingTab = ({ trainingData, onStartTraining }: TrainingTabProps) => {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelAccuracy, setModelAccuracy] = useState<number | null>(null);
  
  // Group training examples by activity type
  const activityTypes: ActivityType[] = ['pass', 'shot', 'dribble', 'touch', 'no_possession'];
  
  // Calculate data distribution percentage
  const totalExamples = trainingData.length || 1; // Avoid division by zero
  const distributions = activityTypes.map(activity => {
    const count = trainingData.filter(d => d.label === activity).length;
    return {
      activity,
      count,
      percentage: Math.round((count / totalExamples) * 100)
    };
  });
  
  // Calculate minimum required examples
  const recommendedMin = 100;
  const hasEnoughData = activityTypes.every(
    activity => trainingData.filter(d => d.label === activity).length >= recommendedMin
  );
  
  const handleStartTraining = () => {
    setIsTraining(true);
    setProgress(0);
    
    // Simulate training progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsTraining(false);
            setModelAccuracy(Math.floor(Math.random() * 15) + 85); // Random accuracy between 85-99%
            // Call the actual training function
            onStartTraining();
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Training Data Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {distributions.map(({ activity, count, percentage }) => (
            <div key={activity} className="text-center p-2 bg-gray-100 rounded-md">
              <div className="font-medium capitalize">{activity.replace('_', ' ')}</div>
              <div className="text-2xl">{count}</div>
              <div className="text-xs text-muted-foreground">examples ({percentage}%)</div>
            </div>
          ))}
        </div>
      </div>
      
      {!hasEnoughData && !isTraining && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            For best results, collect at least {recommendedMin} examples for each activity type.
          </AlertDescription>
        </Alert>
      )}
      
      {isTraining && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Training progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      {modelAccuracy !== null && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Model accuracy</span>
            <span>{modelAccuracy}%</span>
          </div>
          <Progress value={modelAccuracy} className="h-2 bg-gray-200">
            <div 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${modelAccuracy}%` }}
            />
          </Progress>
        </div>
      )}
      
      <div className="pt-2">
        <Button
          onClick={handleStartTraining}
          disabled={trainingData.length < 5 || isTraining}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isTraining ? 'Training in progress...' : `Start Training (${trainingData.length} examples collected)`}
        </Button>
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Recommended: at least 100 examples per activity type for best results
        </p>
      </div>
    </div>
  );
};

export default TrainingTab;
