
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

interface ToleranceRange {
  min: number;
  max: number;
}

interface ToleranceSettings {
  heartRate: ToleranceRange;
  hydration: ToleranceRange;
  lacticAcid: ToleranceRange;
  vo2Max: ToleranceRange;
  muscleFatigue: ToleranceRange;
}

interface ToleranceSettingsDialogProps {
  settings: ToleranceSettings;
  onSave: (settings: ToleranceSettings) => void;
}

const defaultTolerances: ToleranceSettings = {
  heartRate: { min: 60, max: 180 },
  hydration: { min: 80, max: 100 },
  lacticAcid: { min: 0, max: 4 },
  vo2Max: { min: 40, max: 60 },
  muscleFatigue: { min: 0, max: 70 }
};

export const ToleranceSettingsDialog = ({ settings = defaultTolerances, onSave }: ToleranceSettingsDialogProps) => {
  const [tolerances, setTolerances] = useState<ToleranceSettings>(settings);
  const [open, setOpen] = useState(false);
  
  const handleChange = (metric: keyof ToleranceSettings, bound: "min" | "max", value: number) => {
    setTolerances(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [bound]: value
      }
    }));
  };
  
  const handleSave = () => {
    onSave(tolerances);
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings size={16} />
          Tolerance Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Biometric Tolerance Settings</DialogTitle>
          <DialogDescription>
            Set the minimum and maximum tolerance ranges for biometric measurements.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Heart Rate (bpm)</Label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="hr-min" className="text-xs">Min</Label>
                <Input 
                  id="hr-min"
                  type="number" 
                  value={tolerances.heartRate.min}
                  onChange={(e) => handleChange('heartRate', 'min', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="hr-max" className="text-xs">Max</Label>
                <Input 
                  id="hr-max"
                  type="number" 
                  value={tolerances.heartRate.max}
                  onChange={(e) => handleChange('heartRate', 'max', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Hydration (%)</Label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="hydration-min" className="text-xs">Min</Label>
                <Input 
                  id="hydration-min"
                  type="number" 
                  value={tolerances.hydration.min}
                  onChange={(e) => handleChange('hydration', 'min', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="hydration-max" className="text-xs">Max</Label>
                <Input 
                  id="hydration-max"
                  type="number" 
                  value={tolerances.hydration.max}
                  onChange={(e) => handleChange('hydration', 'max', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Lactic Acid (mmol/L)</Label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="lactic-min" className="text-xs">Min</Label>
                <Input 
                  id="lactic-min"
                  type="number" 
                  step="0.1"
                  value={tolerances.lacticAcid.min}
                  onChange={(e) => handleChange('lacticAcid', 'min', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="lactic-max" className="text-xs">Max</Label>
                <Input 
                  id="lactic-max"
                  type="number"
                  step="0.1" 
                  value={tolerances.lacticAcid.max}
                  onChange={(e) => handleChange('lacticAcid', 'max', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">VO2 Max (ml/kg/min)</Label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="vo2-min" className="text-xs">Min</Label>
                <Input 
                  id="vo2-min"
                  type="number" 
                  value={tolerances.vo2Max.min}
                  onChange={(e) => handleChange('vo2Max', 'min', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="vo2-max" className="text-xs">Max</Label>
                <Input 
                  id="vo2-max"
                  type="number" 
                  value={tolerances.vo2Max.max}
                  onChange={(e) => handleChange('vo2Max', 'max', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Muscle Fatigue (%)</Label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="fatigue-min" className="text-xs">Min</Label>
                <Input 
                  id="fatigue-min"
                  type="number" 
                  value={tolerances.muscleFatigue.min}
                  onChange={(e) => handleChange('muscleFatigue', 'min', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="fatigue-max" className="text-xs">Max</Label>
                <Input 
                  id="fatigue-max"
                  type="number" 
                  value={tolerances.muscleFatigue.max}
                  onChange={(e) => handleChange('muscleFatigue', 'max', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={handleSave}>Save Tolerance Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ToleranceSettingsDialog;
