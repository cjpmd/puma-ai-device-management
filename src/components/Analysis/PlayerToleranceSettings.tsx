
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface ToleranceRange {
  min: number;
  max: number;
}

export interface PlayerToleranceSettings {
  playerId: string;
  playerName?: string;
  heartRate: ToleranceRange;
  hydration: ToleranceRange;
  lacticAcid: ToleranceRange;
  vo2Max: ToleranceRange;
  muscleFatigue: ToleranceRange;
}

interface ToleranceSettingsMap {
  [playerId: string]: PlayerToleranceSettings;
}

interface PlayerToleranceSettingsProps {
  globalSettings: PlayerToleranceSettings;
  players: { id: string; name: string }[];
  onSave: (settings: ToleranceSettingsMap, globalSettings: PlayerToleranceSettings) => void;
}

const defaultTolerances = {
  heartRate: { min: 60, max: 180 },
  hydration: { min: 80, max: 100 },
  lacticAcid: { min: 0, max: 4 },
  vo2Max: { min: 40, max: 60 },
  muscleFatigue: { min: 0, max: 70 }
};

const PlayerToleranceSettings = ({ globalSettings, players, onSave }: PlayerToleranceSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("global");
  const { toast } = useToast();
  
  const [globalTolerances, setGlobalTolerances] = useState<PlayerToleranceSettings>({
    playerId: "global",
    playerName: "Global Settings",
    ...globalSettings
  });
  
  const [playerTolerances, setPlayerTolerances] = useState<ToleranceSettingsMap>({});
  
  // Initialize player tolerances with global settings
  useEffect(() => {
    const initialPlayerSettings: ToleranceSettingsMap = {};
    
    players.forEach(player => {
      initialPlayerSettings[player.id] = {
        playerId: player.id,
        playerName: player.name,
        ...globalSettings
      };
    });
    
    // Try to load saved settings from local storage
    const savedSettings = localStorage.getItem('playerToleranceSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge saved settings with defaults for any new players
        const mergedSettings = { ...initialPlayerSettings, ...parsedSettings };
        setPlayerTolerances(mergedSettings);
      } catch (e) {
        console.error('Error parsing saved tolerance settings', e);
        setPlayerTolerances(initialPlayerSettings);
      }
    } else {
      setPlayerTolerances(initialPlayerSettings);
    }
  }, [players, globalSettings]);
  
  const handleGlobalChange = (metric: keyof Omit<PlayerToleranceSettings, 'playerId' | 'playerName'>, bound: "min" | "max", value: number) => {
    setGlobalTolerances(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [bound]: value
      }
    }));
  };
  
  const handlePlayerChange = (playerId: string, metric: keyof Omit<PlayerToleranceSettings, 'playerId' | 'playerName'>, bound: "min" | "max", value: number) => {
    setPlayerTolerances(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [metric]: {
          ...prev[playerId][metric],
          [bound]: value
        }
      }
    }));
  };
  
  const handleSave = () => {
    // Save to localStorage for persistence
    localStorage.setItem('playerToleranceSettings', JSON.stringify(playerTolerances));
    localStorage.setItem('globalToleranceSettings', JSON.stringify(globalTolerances));
    
    onSave(playerTolerances, globalTolerances);
    setOpen(false);
    
    toast({
      title: "Tolerance Settings Updated",
      description: "New biometric tolerance ranges have been applied for all players",
    });
  };
  
  const handleApplyGlobalToPlayer = (playerId: string) => {
    setPlayerTolerances(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        heartRate: { ...globalTolerances.heartRate },
        hydration: { ...globalTolerances.hydration },
        lacticAcid: { ...globalTolerances.lacticAcid },
        vo2Max: { ...globalTolerances.vo2Max },
        muscleFatigue: { ...globalTolerances.muscleFatigue }
      }
    }));
    
    toast({
      title: "Global Settings Applied",
      description: `Global settings have been applied to ${playerTolerances[playerId]?.playerName}`,
    });
  };

  const ToleranceRangeInputs = ({ 
    settings, 
    onChange, 
    playerId = "global" 
  }: { 
    settings: PlayerToleranceSettings, 
    onChange: (metric: keyof Omit<PlayerToleranceSettings, 'playerId' | 'playerName'>, bound: "min" | "max", value: number) => void,
    playerId?: string
  }) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-3 items-center gap-4">
        <Label className="text-right">Heart Rate (bpm)</Label>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${playerId}-hr-min`} className="text-xs">Min</Label>
            <Input 
              id={`${playerId}-hr-min`}
              type="number" 
              value={settings.heartRate.min}
              onChange={(e) => onChange('heartRate', 'min', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor={`${playerId}-hr-max`} className="text-xs">Max</Label>
            <Input 
              id={`${playerId}-hr-max`}
              type="number" 
              value={settings.heartRate.max}
              onChange={(e) => onChange('heartRate', 'max', Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 items-center gap-4">
        <Label className="text-right">Hydration (%)</Label>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${playerId}-hydration-min`} className="text-xs">Min</Label>
            <Input 
              id={`${playerId}-hydration-min`}
              type="number" 
              value={settings.hydration.min}
              onChange={(e) => onChange('hydration', 'min', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor={`${playerId}-hydration-max`} className="text-xs">Max</Label>
            <Input 
              id={`${playerId}-hydration-max`}
              type="number" 
              value={settings.hydration.max}
              onChange={(e) => onChange('hydration', 'max', Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 items-center gap-4">
        <Label className="text-right">Lactic Acid (mmol/L)</Label>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${playerId}-lactic-min`} className="text-xs">Min</Label>
            <Input 
              id={`${playerId}-lactic-min`}
              type="number" 
              step="0.1"
              value={settings.lacticAcid.min}
              onChange={(e) => onChange('lacticAcid', 'min', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor={`${playerId}-lactic-max`} className="text-xs">Max</Label>
            <Input 
              id={`${playerId}-lactic-max`}
              type="number"
              step="0.1" 
              value={settings.lacticAcid.max}
              onChange={(e) => onChange('lacticAcid', 'max', Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 items-center gap-4">
        <Label className="text-right">VO2 Max (ml/kg/min)</Label>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${playerId}-vo2-min`} className="text-xs">Min</Label>
            <Input 
              id={`${playerId}-vo2-min`}
              type="number" 
              value={settings.vo2Max.min}
              onChange={(e) => onChange('vo2Max', 'min', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor={`${playerId}-vo2-max`} className="text-xs">Max</Label>
            <Input 
              id={`${playerId}-vo2-max`}
              type="number" 
              value={settings.vo2Max.max}
              onChange={(e) => onChange('vo2Max', 'max', Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 items-center gap-4">
        <Label className="text-right">Muscle Fatigue (%)</Label>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${playerId}-fatigue-min`} className="text-xs">Min</Label>
            <Input 
              id={`${playerId}-fatigue-min`}
              type="number" 
              value={settings.muscleFatigue.min}
              onChange={(e) => onChange('muscleFatigue', 'min', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor={`${playerId}-fatigue-max`} className="text-xs">Max</Label>
            <Input 
              id={`${playerId}-fatigue-max`}
              type="number" 
              value={settings.muscleFatigue.max}
              onChange={(e) => onChange('muscleFatigue', 'max', Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings size={16} />
          Player Tolerance Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Biometric Tolerance Settings</DialogTitle>
          <DialogDescription>
            Set the minimum and maximum tolerance ranges for biometric measurements per player.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="global" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="global">Global Settings</TabsTrigger>
            <TabsTrigger value="players">Individual Players</TabsTrigger>
          </TabsList>
          
          <TabsContent value="global">
            <ToleranceRangeInputs 
              settings={globalTolerances} 
              onChange={handleGlobalChange} 
            />
          </TabsContent>
          
          <TabsContent value="players">
            <div className="mb-4">
              <Label>Select Player</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {players.map((player) => (
                  <Card 
                    key={player.id}
                    className={`p-3 cursor-pointer ${activeTab === player.id ? 'border-primary' : ''}`}
                    onClick={() => setActiveTab(player.id)}
                  >
                    <div className="font-medium">{player.name}</div>
                  </Card>
                ))}
              </div>
            </div>
            
            {players.map((player) => (
              <div key={player.id} className={activeTab === player.id ? '' : 'hidden'}>
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg mb-2">{player.name}'s Settings</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleApplyGlobalToPlayer(player.id)}
                  >
                    Apply Global Settings
                  </Button>
                </div>
                {playerTolerances[player.id] && (
                  <ToleranceRangeInputs 
                    settings={playerTolerances[player.id]} 
                    onChange={(metric, bound, value) => handlePlayerChange(player.id, metric, bound, value)} 
                    playerId={player.id}
                  />
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button onClick={handleSave}>Save All Tolerance Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerToleranceSettings;
