
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

interface DataUploadTabProps {
  isRecording: boolean;
  totalPossessionTime: number;
  currentSessionId: string | null;
  onVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSensorDataUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleRecording: () => void;
}

const DataUploadTab = ({
  isRecording,
  totalPossessionTime,
  currentSessionId,
  onVideoUpload,
  onSensorDataUpload,
  onToggleRecording,
}: DataUploadTabProps) => {
  return (
    <div className="space-y-4">
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
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Upload Training Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Video Recording</label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={onVideoUpload}
                  className="cursor-pointer"
                  disabled={!isRecording}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your MP4 video recording
                </p>
              </div>
              <div>
                <label className="block text-sm mb-2">Sensor Logger Data (JSON)</label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={onSensorDataUpload}
                  className="cursor-pointer"
                  disabled={!isRecording}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload JSON from Sensor Logger app
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <Button
          variant={isRecording ? 'destructive' : 'default'}
          onClick={onToggleRecording}
          className="w-full sm:w-auto"
        >
          {isRecording ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        
        <div className="text-center sm:text-right">
          <div className="text-sm font-medium">Total Possession Time</div>
          <div className="text-2xl">{Math.round(totalPossessionTime / 1000)}s</div>
          <div className="text-xs text-muted-foreground">
            {isRecording ? 'Recording active' : 'Ready to record'}
          </div>
        </div>
      </div>
      
      {isRecording && currentSessionId && (
        <div className="bg-gray-50 p-3 rounded-md text-sm">
          <div className="font-medium">Active Session ID</div>
          <div className="text-muted-foreground break-all">{currentSessionId}</div>
        </div>
      )}
    </div>
  );
};

export default DataUploadTab;
