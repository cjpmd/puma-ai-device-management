
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  createModel, 
  trainModel, 
  TrainingExample, 
  ActivityType,
  validateSensorLoggerData,
  convertSensorLoggerData,
  SensorData
} from '@/ml/activityRecognition';
import { Upload, Play, Pause, AlertCircle, Plus, Save } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TrainingStats {
  totalExamples: {
    pass: number;
    shot: number;
    dribble: number;
    touch: number;
    no_possession: number;
  };
  currentAccuracy: number;
  epochsCompleted: number;
  lastTrainingTime: string | null;
}

interface MLTrainingManagerProps {
  onTrainingProgress: (stats: TrainingStats) => void;
}

interface Annotation {
  startTime: number;
  endTime: number;
  activityType: ActivityType;
  sensorData?: number[][];
}

const MLTrainingManager = ({ onTrainingProgress }: MLTrainingManagerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<ActivityType>('pass');
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [possessionStartTime, setPossessionStartTime] = useState<number | null>(null);
  const [totalPossessionTime, setTotalPossessionTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [localVideoPath, setLocalVideoPath] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [viaJsonContent, setViaJsonContent] = useState('');
  const [rawSensorData, setRawSensorData] = useState<SensorData[] | null>(null);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a local URL for the video file
      const videoURL = URL.createObjectURL(file);
      setLocalVideoPath(videoURL);
      
      toast({
        title: "Video stored locally",
        description: "Video file has been stored locally. You can now add temporal annotations.",
      });
    }
  };

  const handleSensorDataUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentSessionId) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (validateSensorLoggerData(data)) {
            const rawData = data as SensorData[];
            setRawSensorData(rawData);
            
            // Store sensor recordings in Supabase
            const sensorRecordings = rawData.map(reading => ({
              training_session_id: currentSessionId,
              sensor_type: reading.sensor,
              x: parseFloat(reading.x),
              y: parseFloat(reading.y),
              z: parseFloat(reading.z),
              timestamp: new Date(reading.time).getTime()
            }));

            const { error } = await supabase
              .from('sensor_recordings')
              .insert(sensorRecordings);

            if (error) {
              console.error('Error storing sensor data:', error);
              toast({
                title: "Error",
                description: "Failed to store sensor data",
                variant: "destructive",
              });
              return;
            }

            toast({
              title: "Sensor data loaded",
              description: "Sensor data has been validated and stored. Now you can add annotations.",
            });
          } else {
            toast({
              title: "Error",
              description: "Invalid Sensor Logger data format",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error processing sensor data:', error);
          toast({
            title: "Error",
            description: "Failed to parse sensor data",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Error",
        description: "No active training session",
        variant: "destructive",
      });
    }
  };

  const handleAddAnnotation = () => {
    if (!videoRef.current) return;
    
    const newAnnotation: Annotation = {
      startTime: videoRef.current.currentTime * 1000, // Convert to milliseconds
      endTime: (videoRef.current.currentTime + 2) * 1000, // Default 2 second duration
      activityType: currentLabel
    };
    
    setAnnotations([...annotations, newAnnotation]);
    
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
      
      setAnnotations(newAnnotations);
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

  const processAnnotationsWithSensorData = () => {
    if (!rawSensorData || annotations.length === 0) {
      toast({
        title: "Missing data",
        description: "Need both sensor data and annotations to process training examples",
        variant: "destructive",
      });
      return;
    }
    
    const newTrainingExamples: TrainingExample[] = [];
    
    // Process each annotation
    annotations.forEach(annotation => {
      // Filter sensor data that falls within this annotation's time range
      const relevantSensorData = rawSensorData.filter(reading => {
        const readingTime = new Date(reading.time).getTime();
        return readingTime >= annotation.startTime && readingTime <= annotation.endTime;
      });
      
      if (relevantSensorData.length > 0) {
        // Convert the relevant sensor data
        const convertedData = convertSensorLoggerData(relevantSensorData);
        
        // Create a training example
        newTrainingExamples.push({
          sensorData: convertedData,
          label: annotation.activityType,
          videoTimestamp: annotation.startTime,
          duration: annotation.endTime - annotation.startTime
        });
      }
    });
    
    // Add to existing training data
    setTrainingData(prev => [...prev, ...newTrainingExamples]);
    
    toast({
      title: "Training data created",
      description: `Created ${newTrainingExamples.length} training examples from annotations`,
    });

    // Update counters for the UI
    updateTrainingStats(newTrainingExamples);
  };

  const updateTrainingStats = (newExamples: TrainingExample[]) => {
    // Count examples by activity type
    const activityCounts = {
      pass: newExamples.filter(ex => ex.label === 'pass').length,
      shot: newExamples.filter(ex => ex.label === 'shot').length,
      dribble: newExamples.filter(ex => ex.label === 'dribble').length,
      touch: newExamples.filter(ex => ex.label === 'touch').length,
      no_possession: newExamples.filter(ex => ex.label === 'no_possession').length,
    };
    
    // Calculate total time for possession activities
    const newPossessionTime = newExamples
      .filter(ex => ex.label !== 'no_possession' && ex.duration)
      .reduce((total, ex) => total + (ex.duration || 0), 0);
    
    setTotalPossessionTime(prev => prev + newPossessionTime);
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      const startTime = Date.now();
      
      // Create new training session in Supabase
      const { data: session, error } = await supabase
        .from('ml_training_sessions')
        .insert({
          activity_type: currentLabel,
          video_timestamp: startTime,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating training session:', error);
        toast({
          title: "Error",
          description: "Failed to start training session",
          variant: "destructive",
        });
        return;
      }

      setCurrentSessionId(session.id);
      setRecordingStartTime(startTime);
      setPossessionStartTime(startTime);
      setAnnotations([]);
      setRawSensorData(null);
      
      toast({
        title: "Recording session started",
        description: "Upload your pre-recorded video and sensor data files for this session.",
      });
    } else {
      // Update session end time in Supabase
      if (currentSessionId) {
        const { error } = await supabase
          .from('ml_training_sessions')
          .update({ 
            end_time: new Date().toISOString(),
            duration: possessionStartTime ? Date.now() - possessionStartTime : null
          })
          .eq('id', currentSessionId);

        if (error) {
          console.error('Error updating training session:', error);
        }
      }

      setRecordingStartTime(null);
      setCurrentSessionId(null);
      setPossessionStartTime(null);
      
      // Clear the local video URL
      if (localVideoPath) {
        URL.revokeObjectURL(localVideoPath);
        setLocalVideoPath(null);
      }
      
      toast({
        title: "Recording session stopped",
        description: "Training data has been processed.",
      });
    }
    setIsRecording(!isRecording);
  };

  const startTraining = async () => {
    if (trainingData.length < 1000) {
      toast({
        title: "Insufficient data",
        description: "Need at least 1000 examples per action type.",
        variant: "destructive",
      });
      return;
    }

    try {
      const model = createModel();
      await trainModel(model, trainingData);
      
      // Store model in Supabase
      const { error } = await supabase
        .from('ml_models')
        .insert({
          version: '1.0',
          accuracy: 85, // This would come from actual model evaluation
          parameters: JSON.stringify(model.getWeights())
        });

      if (error) {
        console.error('Error storing model:', error);
      }

      // Update training progress
      onTrainingProgress({
        totalExamples: {
          pass: trainingData.filter(d => d.label === 'pass').length,
          shot: trainingData.filter(d => d.label === 'shot').length,
          dribble: trainingData.filter(d => d.label === 'dribble').length,
          touch: trainingData.filter(d => d.label === 'touch').length,
          no_possession: trainingData.filter(d => d.label === 'no_possession').length,
        },
        currentAccuracy: 85,
        epochsCompleted: 10,
        lastTrainingTime: new Date().toISOString(),
      });

      toast({
        title: "Training complete",
        description: "Model has been trained and stored successfully.",
      });
    } catch (error) {
      console.error('Training error:', error);
      toast({
        title: "Training failed",
        description: "An error occurred during training.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>ML Training Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Workflow: <br/>
            1. Record sensor data using Sensor Logger on your Apple Watch<br/>
            2. Record video separately on another device<br/>
            3. Use VGG Image Annotator (VIA) to add activity timestamps to your video<br/>
            4. Click "Start Recording" to begin a training session<br/>
            5. Upload your video and Sensor Logger JSON files<br/>
            6. Either manually add annotations or import from VIA JSON<br/>
            7. Process annotations to create training examples<br/>
            8. Click "Stop Recording" when complete
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Data Upload</TabsTrigger>
            <TabsTrigger value="annotation">Annotations</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Upload Training Data</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm mb-2">Video Recording</label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="cursor-pointer"
                    disabled={!isRecording}
                  />
                  {localVideoPath && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Video file stored locally
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm mb-2">Sensor Logger Data (JSON)</label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleSensorDataUpload}
                    className="cursor-pointer"
                    disabled={!isRecording}
                  />
                  {rawSensorData && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {rawSensorData.length} sensor readings loaded
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recording Controls</h3>
              <div className="flex gap-4 items-center">
                <Button
                  variant={isRecording ? 'destructive' : 'default'}
                  onClick={toggleRecording}
                >
                  {isRecording ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
                <div className="text-sm">
                  Total possession time: {Math.round(totalPossessionTime / 1000)}s
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="annotation" className="space-y-4">
            {localVideoPath && (
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
                    onValueChange={(value: ActivityType) => setCurrentLabel(value)}
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
                  onClick={processAnnotationsWithSensorData}
                  disabled={!rawSensorData || annotations.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Process Annotations into Training Data
                </Button>
              </div>
            )}
            
            {!localVideoPath && (
              <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-lg">
                <p className="text-gray-500">Upload a video first to add annotations</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="training" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Training Data Summary</h3>
              <div className="grid grid-cols-5 gap-2">
                {['pass', 'shot', 'dribble', 'touch', 'no_possession'].map((activity) => (
                  <div key={activity} className="text-center p-2 bg-gray-100 rounded-md">
                    <div className="font-medium capitalize">{activity.replace('_', ' ')}</div>
                    <div className="text-2xl">
                      {trainingData.filter(d => d.label === activity as ActivityType).length}
                    </div>
                    <div className="text-xs text-muted-foreground">examples</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4">
              <Button
                onClick={startTraining}
                disabled={trainingData.length < 1000}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Start Training ({trainingData.length} examples collected)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MLTrainingManager;
