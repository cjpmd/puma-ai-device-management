
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HyperparameterResult, 
  HyperparameterSearchSpace, 
  ModelHyperparameters,
  gridSearch
} from "@/ml/hyperparameterTuning";
import { TrainingExample } from "@/ml/activityRecognition";
import { createStratifiedKFolds } from "@/ml/crossValidation";
import TrainingChart from "./TrainingChart";

interface HyperparameterTuningTabProps {
  trainingData: TrainingExample[];
  onSaveHyperparameters: (hyperparameters: ModelHyperparameters) => void;
}

const HyperparameterTuningTab = ({ 
  trainingData, 
  onSaveHyperparameters 
}: HyperparameterTuningTabProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("manual");

  const [hyperparameters, setHyperparameters] = useState<ModelHyperparameters>({
    learningRate: 0.001,
    batchSize: 32,
    epochs: 50,
    lstmUnits1: 64,
    lstmUnits2: 32,
    dropoutRate: 0.2
  });

  const [searchSpace, setSearchSpace] = useState<HyperparameterSearchSpace>({
    learningRate: [0.0001, 0.001, 0.01],
    batchSize: [16, 32, 64],
    epochs: [20, 50],
    lstmUnits1: [32, 64, 128],
    lstmUnits2: [16, 32, 64],
    dropoutRate: [0.1, 0.2, 0.3]
  });

  const [searchResults, setSearchResults] = useState<HyperparameterResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentParams, setCurrentParams] = useState<string>("");

  const handleStartSearch = async () => {
    if (trainingData.length < 500) {
      toast({
        title: "Insufficient data",
        description: "Need at least 500 training examples for hyperparameter tuning.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setProgress(0);

    try {
      // Split data into train and validation sets using cross-validation
      const folds = createStratifiedKFolds(trainingData, 5);
      const { trainData, valData } = folds[0]; // Use the first fold for simplicity

      // Calculate total combinations for progress tracking
      const totalCombinations = 
        searchSpace.learningRate.length *
        searchSpace.batchSize.length *
        searchSpace.epochs.length *
        searchSpace.lstmUnits1.length *
        searchSpace.lstmUnits2.length *
        searchSpace.dropoutRate.length;

      // Start grid search
      const results = await gridSearch(
        trainData,
        valData,
        searchSpace,
        (current, total, params, accuracy) => {
          setProgress((current / total) * 100);
          setCurrentParams(
            `Testing: LR=${params.learningRate}, Batch=${params.batchSize}, Units=${params.lstmUnits1}/${params.lstmUnits2}`
          );
        }
      );

      setSearchResults(results);
      
      if (results.length > 0) {
        // Automatically select the best hyperparameters
        setHyperparameters(results[0].hyperparameters);
        
        toast({
          title: "Search complete",
          description: `Found best hyperparameters with ${(results[0].finalAccuracy * 100).toFixed(1)}% accuracy.`,
        });
      }
    } catch (error) {
      console.error('Error during hyperparameter search:', error);
      toast({
        title: "Search failed",
        description: "An error occurred during hyperparameter search.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setProgress(100);
    }
  };

  // Generate training chart data from search results
  const getChartData = (result: HyperparameterResult) => {
    return result.history.accuracy.map((acc, index) => ({
      epoch: index + 1,
      accuracy: acc,
      loss: result.history.loss[index],
      valAccuracy: result.history.valAccuracy[index],
      valLoss: result.history.valLoss[index]
    }));
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Tuning</TabsTrigger>
          <TabsTrigger value="search">Grid Search</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Hyperparameter Tuning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Learning Rate: {hyperparameters.learningRate}</Label>
                </div>
                <Slider 
                  min={0.0001}
                  max={0.01}
                  step={0.0001}
                  value={[hyperparameters.learningRate]}
                  onValueChange={(values) => setHyperparameters({...hyperparameters, learningRate: values[0]})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Batch Size: {hyperparameters.batchSize}</Label>
                </div>
                <Slider 
                  min={8}
                  max={128}
                  step={8}
                  value={[hyperparameters.batchSize]}
                  onValueChange={(values) => setHyperparameters({...hyperparameters, batchSize: values[0]})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Epochs: {hyperparameters.epochs}</Label>
                </div>
                <Slider 
                  min={10}
                  max={100}
                  step={5}
                  value={[hyperparameters.epochs]}
                  onValueChange={(values) => setHyperparameters({...hyperparameters, epochs: values[0]})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>LSTM Units (Layer 1): {hyperparameters.lstmUnits1}</Label>
                </div>
                <Slider 
                  min={16}
                  max={256}
                  step={16}
                  value={[hyperparameters.lstmUnits1]}
                  onValueChange={(values) => setHyperparameters({...hyperparameters, lstmUnits1: values[0]})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>LSTM Units (Layer 2): {hyperparameters.lstmUnits2}</Label>
                </div>
                <Slider 
                  min={8}
                  max={128}
                  step={8}
                  value={[hyperparameters.lstmUnits2]}
                  onValueChange={(values) => setHyperparameters({...hyperparameters, lstmUnits2: values[0]})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Dropout Rate: {hyperparameters.dropoutRate}</Label>
                </div>
                <Slider 
                  min={0}
                  max={0.5}
                  step={0.05}
                  value={[hyperparameters.dropoutRate]}
                  onValueChange={(values) => setHyperparameters({...hyperparameters, dropoutRate: values[0]})}
                />
              </div>
              
              <Button 
                onClick={() => onSaveHyperparameters(hyperparameters)}
                className="mt-4 w-full"
              >
                Apply Hyperparameters
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="search" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Grid Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Learning Rates (comma-separated)</Label>
                  <Input 
                    value={searchSpace.learningRate.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                      setSearchSpace({...searchSpace, learningRate: values});
                    }}
                    disabled={isSearching}
                  />
                </div>
                
                <div>
                  <Label>Batch Sizes (comma-separated)</Label>
                  <Input 
                    value={searchSpace.batchSize.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value.split(",").map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                      setSearchSpace({...searchSpace, batchSize: values});
                    }}
                    disabled={isSearching}
                  />
                </div>
                
                <div>
                  <Label>Epochs (comma-separated)</Label>
                  <Input 
                    value={searchSpace.epochs.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value.split(",").map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                      setSearchSpace({...searchSpace, epochs: values});
                    }}
                    disabled={isSearching}
                  />
                </div>
                
                <div>
                  <Label>LSTM Units Layer 1 (comma-separated)</Label>
                  <Input 
                    value={searchSpace.lstmUnits1.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value.split(",").map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                      setSearchSpace({...searchSpace, lstmUnits1: values});
                    }}
                    disabled={isSearching}
                  />
                </div>
                
                <div>
                  <Label>LSTM Units Layer 2 (comma-separated)</Label>
                  <Input 
                    value={searchSpace.lstmUnits2.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value.split(",").map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                      setSearchSpace({...searchSpace, lstmUnits2: values});
                    }}
                    disabled={isSearching}
                  />
                </div>
                
                <div>
                  <Label>Dropout Rates (comma-separated)</Label>
                  <Input 
                    value={searchSpace.dropoutRate.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                      setSearchSpace({...searchSpace, dropoutRate: values});
                    }}
                    disabled={isSearching}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleStartSearch}
                disabled={isSearching || trainingData.length < 500}
                className="mt-4 w-full"
              >
                {isSearching ? "Searching..." : "Start Grid Search"}
              </Button>
              
              {isSearching && (
                <div className="space-y-1">
                  <Progress value={progress} />
                  <p className="text-xs text-center text-muted-foreground">{currentParams}</p>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium mb-2">Top Results:</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {searchResults.slice(0, 5).map((result, index) => (
                      <div key={index} className="p-2 border rounded-md">
                        <div className="flex justify-between">
                          <span>Rank #{index + 1}</span>
                          <span>Accuracy: {(result.finalAccuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          LR: {result.hyperparameters.learningRate}, 
                          Batch: {result.hyperparameters.batchSize},
                          Units: {result.hyperparameters.lstmUnits1}/{result.hyperparameters.lstmUnits2},
                          Dropout: {result.hyperparameters.dropoutRate}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setHyperparameters(result.hyperparameters);
                              setActiveTab("manual");
                            }}
                          >
                            Use These Parameters
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <TrainingChart 
                      data={getChartData(searchResults[0])}
                      title="Best Model Training Curve"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HyperparameterTuningTab;
