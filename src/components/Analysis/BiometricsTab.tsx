
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import PlayerSelector from "./PlayerSelector";
import BiometricChart from "./BiometricChart";
import BiometricDetailsCard from "./BiometricDetailsCard";
import { HeartPulse, Droplet, Thermometer, Lungs, Activity, Shield, Clock } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position?: string;
}

interface BiometricData {
  time: string;
  value: number;
}

const BiometricsTab = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [timeRange, setTimeRange] = useState<string>("today");
  const [playerMode, setPlayerMode] = useState<"performance" | "recovery">("performance");
  
  // Sample biometric data for demonstration
  const heartRateData: BiometricData[] = [
    { time: "09:00", value: 72 },
    { time: "09:15", value: 110 },
    { time: "09:30", value: 145 },
    { time: "09:45", value: 165 },
    { time: "10:00", value: 155 },
    { time: "10:15", value: 140 },
    { time: "10:30", value: 120 },
    { time: "10:45", value: 110 },
    { time: "11:00", value: 85 },
  ];
  
  const hydrationData: BiometricData[] = [
    { time: "09:00", value: 98 },
    { time: "09:15", value: 97 },
    { time: "09:30", value: 95 },
    { time: "09:45", value: 92 },
    { time: "10:00", value: 89 },
    { time: "10:15", value: 86 },
    { time: "10:30", value: 84 },
    { time: "10:45", value: 82 },
    { time: "11:00", value: 80 },
  ];
  
  const lacticAcidData: BiometricData[] = [
    { time: "09:00", value: 1.2 },
    { time: "09:15", value: 1.5 },
    { time: "09:30", value: 2.8 },
    { time: "09:45", value: 4.2 },
    { time: "10:00", value: 5.5 },
    { time: "10:15", value: 6.2 },
    { time: "10:30", value: 5.1 },
    { time: "10:45", value: 3.8 },
    { time: "11:00", value: 2.3 },
  ];
  
  const vo2MaxData: BiometricData[] = [
    { time: "09:00", value: 48 },
    { time: "09:15", value: 50 },
    { time: "09:30", value: 52 },
    { time: "09:45", value: 53 },
    { time: "10:00", value: 54 },
    { time: "10:15", value: 54 },
    { time: "10:30", value: 53 },
    { time: "10:45", value: 52 },
    { time: "11:00", value: 50 },
  ];
  
  const muscleFatigueData: BiometricData[] = [
    { time: "09:00", value: 12 },
    { time: "09:15", value: 18 },
    { time: "09:30", value: 25 },
    { time: "09:45", value: 38 },
    { time: "10:00", value: 52 },
    { time: "10:15", value: 65 },
    { time: "10:30", value: 72 },
    { time: "10:45", value: 78 },
    { time: "11:00", value: 80 },
  ];

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleModeChange = (checked: boolean) => {
    setPlayerMode(checked ? "recovery" : "performance");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="w-full sm:w-1/3">
          <PlayerSelector onPlayerSelect={handlePlayerSelect} selectedPlayerId={selectedPlayer?.id} />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Label htmlFor="mode-switch" className={playerMode === "performance" ? "text-primary" : "text-muted-foreground"}>
              Performance Mode
            </Label>
            <Switch 
              id="mode-switch" 
              checked={playerMode === "recovery"} 
              onCheckedChange={handleModeChange} 
            />
            <Label htmlFor="mode-switch" className={playerMode === "recovery" ? "text-destructive" : "text-muted-foreground"}>
              Recovery Mode
            </Label>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="season">Full Season</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {selectedPlayer ? (
        <>
          <div className="bg-white shadow rounded-lg p-4 mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{selectedPlayer.name}'s Biometric Data</h2>
            {playerMode === "recovery" && (
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                Recovery Mode Active
              </span>
            )}
            {playerMode === "performance" && (
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                Performance Tracking Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <BiometricDetailsCard 
              title="Heart Rate"
              value={playerMode === "performance" ? "132 bpm" : "76 bpm"}
              icon={<HeartPulse className="h-5 w-5" />}
              change={playerMode === "performance" ? "+12%" : "-8%"}
              status={playerMode === "performance" ? "normal" : "good"}
            />
            <BiometricDetailsCard 
              title="Hydration"
              value={playerMode === "performance" ? "82%" : "96%"}
              icon={<Droplet className="h-5 w-5" />}
              change={playerMode === "performance" ? "-15%" : "+4%"}
              status={playerMode === "performance" ? "warning" : "good"}
            />
            <BiometricDetailsCard 
              title="Lactic Acid"
              value={playerMode === "performance" ? "5.2 mmol/L" : "1.3 mmol/L"}
              icon={<Thermometer className="h-5 w-5" />}
              change={playerMode === "performance" ? "+120%" : "-40%"}
              status={playerMode === "performance" ? "warning" : "good"}
            />
            <BiometricDetailsCard 
              title="VO2 Max"
              value={playerMode === "performance" ? "52 ml/kg/min" : "48 ml/kg/min"}
              icon={<Lungs className="h-5 w-5" />}
              change={playerMode === "performance" ? "+4%" : "-2%"}
              status="good"
            />
          </div>

          <Tabs defaultValue="charts" className="w-full">
            <TabsList>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="combined">Combined Analysis</TabsTrigger>
              {playerMode === "recovery" && <TabsTrigger value="recovery">Recovery Plan</TabsTrigger>}
              {playerMode === "recovery" && <TabsTrigger value="smart-bandage">Smart Bandage Data</TabsTrigger>}
            </TabsList>
            <TabsContent value="charts" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                <BiometricChart 
                  title="Heart Rate" 
                  data={heartRateData} 
                  color="#ef4444" 
                  unit="bpm"
                  threshold={170}
                />
                <BiometricChart 
                  title="Hydration Level" 
                  data={hydrationData} 
                  color="#0ea5e9" 
                  unit="%"
                  threshold={80}
                  thresholdDirection="below"
                />
                <BiometricChart 
                  title="Lactic Acid" 
                  data={lacticAcidData} 
                  color="#8b5cf6" 
                  unit="mmol/L"
                  threshold={4}
                />
                <BiometricChart 
                  title="VO2 Max" 
                  data={vo2MaxData} 
                  color="#10b981" 
                  unit="ml/kg/min"
                />
                <BiometricChart 
                  title="Muscle Fatigue" 
                  data={muscleFatigueData} 
                  color="#f59e0b" 
                  unit="%"
                  threshold={70}
                />
              </div>
            </TabsContent>
            <TabsContent value="combined">
              <div className="mt-4 grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Combined Biometric & Positional Data</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[400px] relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-muted-foreground">Interactive biometric and positional data visualization would appear here.</p>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 p-4 rounded-lg border">
                      <h3 className="font-semibold mb-2">Insights</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <Activity className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                          <span>Heart rate peaked at 165 bpm during high-intensity sprints in the final third.</span>
                        </li>
                        <li className="flex items-start">
                          <Shield className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                          <span>Hydration levels dropped below optimal threshold after 30 minutes of play.</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                          <span>Recovery periods insufficient during central midfield positioning - consider rotation.</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {playerMode === "recovery" && (
              <TabsContent value="recovery">
                <div className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recovery Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 border rounded-md bg-slate-50">
                          <h3 className="font-medium mb-2">Medical Assessment</h3>
                          <p className="text-sm text-muted-foreground">Grade 2 hamstring strain, estimated recovery time: 2-3 weeks</p>
                        </div>
                        
                        <div className="p-4 border rounded-md">
                          <h3 className="font-medium mb-2">Physio Instructions</h3>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600 mr-2">1</span>
                              <span>Light stretching exercises 2x daily</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600 mr-2">2</span>
                              <span>Ice therapy after exercises</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600 mr-2">3</span>
                              <span>Resistance band work starting day 5</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardHeader className="p-4">
                              <CardTitle className="text-sm">Current Phase</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4 px-4">
                              <p className="text-xl font-bold">Early Recovery</p>
                              <p className="text-xs text-muted-foreground">Day 4 of 21</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="p-4">
                              <CardTitle className="text-sm">Next Phase</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4 px-4">
                              <p className="text-xl font-bold">Strength Building</p>
                              <p className="text-xs text-muted-foreground">Starts in 3 days</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="p-4">
                              <CardTitle className="text-sm">Return to Play</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4 px-4">
                              <p className="text-xl font-bold">17 days</p>
                              <p className="text-xs text-muted-foreground">Target date: June 6</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
            {playerMode === "recovery" && (
              <TabsContent value="smart-bandage">
                <div className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Smart Bandage Data - Hamstring Recovery</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="p-4">
                            <CardTitle className="text-sm">Muscle Tension Readings</CardTitle>
                          </CardHeader>
                          <CardContent className="h-[200px] relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <p className="text-muted-foreground">Muscle tension visualization would appear here</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="p-4">
                            <CardTitle className="text-sm">Inflammation Indicators</CardTitle>
                          </CardHeader>
                          <CardContent className="h-[200px] relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <p className="text-muted-foreground">Inflammation data visualization would appear here</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="md:col-span-2">
                          <CardHeader className="p-4">
                            <CardTitle className="text-sm">Smart Bandage Sensor Readouts</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                              <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <h4 className="text-xs text-muted-foreground mb-1">Strain</h4>
                                <p className="text-xl font-bold">23.4%</p>
                                <p className="text-xs text-green-600">-12% from yesterday</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <h4 className="text-xs text-muted-foreground mb-1">Force</h4>
                                <p className="text-xl font-bold">2.1 N</p>
                                <p className="text-xs text-green-600">-0.3 N from yesterday</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <h4 className="text-xs text-muted-foreground mb-1">Temperature</h4>
                                <p className="text-xl font-bold">37.2°C</p>
                                <p className="text-xs text-green-600">-0.4°C from yesterday</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <h4 className="text-xs text-muted-foreground mb-1">Swelling</h4>
                                <p className="text-xl font-bold">8%</p>
                                <p className="text-xs text-green-600">-3% from yesterday</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <h4 className="text-xs text-muted-foreground mb-1">Range of Motion</h4>
                                <p className="text-xl font-bold">72°</p>
                                <p className="text-xs text-green-600">+5° from yesterday</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-gray-50">
          <HeartPulse className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-1">Select a player to view biometric data</h3>
          <p className="text-muted-foreground">Player biometric information will be displayed here</p>
        </div>
      )}
    </div>
  );
};

export default BiometricsTab;
