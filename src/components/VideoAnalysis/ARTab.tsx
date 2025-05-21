
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Database, Info, Settings } from 'lucide-react';
import AugmentedRealityCamera from './AugmentedRealityCamera';

const ARTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('live');
  
  const handleRequestPermissions = () => {
    toast({
      title: "Requesting Permissions",
      description: "Please allow access to your camera when prompted",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Augmented Reality Tracking</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRequestPermissions}
        >
          <Camera className="mr-2 h-4 w-4" />
          Request Camera Access
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Player AR Analysis</CardTitle>
          <CardDescription>
            Track and identify players using augmented reality. Point your camera at players to view real-time data overlays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="live">
                <Camera className="h-4 w-4 mr-2" />
                Live AR
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="info">
                <Info className="h-4 w-4 mr-2" />
                Help
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="live" className="space-y-4">
              <AugmentedRealityCamera 
                width={640} 
                height={480} 
              />
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="text-lg font-medium mb-2">Detection Details</h3>
                  <p className="text-sm text-muted-foreground">
                    The AR system uses computer vision to detect and identify players by their kit numbers.
                    Detection works best in good lighting conditions with clear visibility of player numbers.
                  </p>
                </Card>
                
                <Card className="p-4">
                  <h3 className="text-lg font-medium mb-2">Data Sources</h3>
                  <div className="flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    <span className="text-sm">Connected to performance database</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Player statistics and biometric data are pulled from the team database in real-time.
                  </p>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-4">AR Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Detection Sensitivity</h4>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      defaultValue="7"
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Data Refresh Rate</h4>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      defaultValue="5"
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1s</span>
                      <span>500ms</span>
                      <span>100ms</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button>Save Settings</Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="info">
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">How to Use AR Tracking</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Allow camera access when prompted</li>
                  <li>Press the "Start" button to begin player tracking</li>
                  <li>Point your camera at players on the field</li>
                  <li>The system will identify players by their kit numbers</li>
                  <li>Use the toggle buttons to switch between different data overlays</li>
                  <li>Press "Stop" when you're finished</li>
                </ol>
                
                <h3 className="text-lg font-medium mt-4 mb-2">Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Modern browser with WebRTC support</li>
                  <li>Camera access</li>
                  <li>Stable internet connection for database lookups</li>
                  <li>Good lighting conditions for optimal detection</li>
                </ul>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ARTab;
