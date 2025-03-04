
import { Upload, Info, BarChart2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ActivityType, TrainingExample } from '@/ml/activityRecognition';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useModelTrainingService } from './ModelTrainingService';

interface TrainingTabProps {
  trainingData: TrainingExample[];
  onStartTraining: () => void;
}

const TrainingTab = ({ trainingData, onStartTraining }: TrainingTabProps) => {
  const { isTraining, progress, modelAccuracy, startTraining } = useModelTrainingService();
  
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
    startTraining();
    // Call the actual training function passed from parent
    onStartTraining();
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <BarChart2 className="h-4 w-4 mr-2" />
            Training Data Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {distributions.map(({ activity, count, percentage }) => (
              <div key={activity} className="text-center p-2 bg-gray-50 rounded-md">
                <div className="font-medium capitalize">{activity.replace('_', ' ')}</div>
                <div className="text-2xl">{count}</div>
                <div className="text-xs text-muted-foreground">examples ({percentage}%)</div>
                <Progress 
                  value={(count / recommendedMin) * 100} 
                  className="h-1 mt-2" 
                  // Remove the custom indicator prop and use a styled div instead
                />
                {/* Apply color using a separate div with conditional styling */}
                <div className={`h-1 mt-1 rounded-full ${
                  count >= recommendedMin ? "bg-green-500" : "bg-amber-500"
                }`} 
                  style={{ width: `${Math.min((count / recommendedMin) * 100, 100)}%` }} 
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {!hasEnoughData && !isTraining && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            For best results, collect at least {recommendedMin} examples for each activity type.
          </AlertDescription>
        </Alert>
      )}
      
      {isTraining && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Training Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Model training</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-2 rounded-md">
                <div className="text-muted-foreground">Current batch</div>
                <div>{Math.floor(progress / 10)} / 10</div>
              </div>
              
              <div className="bg-gray-50 p-2 rounded-md">
                <div className="text-muted-foreground">Training examples</div>
                <div>{totalExamples}</div>
              </div>
              
              <div className="bg-gray-50 p-2 rounded-md">
                <div className="text-muted-foreground">Learning rate</div>
                <div>0.001</div>
              </div>
              
              <div className="bg-gray-50 p-2 rounded-md">
                <div className="text-muted-foreground">Batch size</div>
                <div>32</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {modelAccuracy !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model Evaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Model accuracy</span>
              <span>{modelAccuracy}%</span>
            </div>
            <Progress value={modelAccuracy} className="h-2" />
            <div 
              className="h-2 bg-green-500 rounded-full mt-1" 
              style={{ width: `${modelAccuracy}%` }}
            />
            
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              {modelAccuracy < 90 ? 
                "Consider collecting more training data to improve model accuracy." :
                "Good model accuracy achieved! You can now use this model for inference."
              }
            </div>
          </CardContent>
        </Card>
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
