import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface PhysicalDataFormProps {
  onComplete: () => void;
}

const PhysicalDataForm = ({ onComplete }: PhysicalDataFormProps) => {
  const [age, setAge] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [dominantFoot, setDominantFoot] = useState<'left' | 'right' | 'both'>('right');
  const [shoeSize, setShoeSize] = useState<string>('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([
          { 
            name: 'Test Player',
            age: parseInt(age),
            squad_number: 1,
            player_type: 'OUTFIELD'
          }
        ])
        .select()
        .single();

      if (playerError) throw playerError;

      const { error: physicalDataError } = await supabase
        .from('player_physical_data')
        .insert([
          {
            player_id: playerData.id,
            age: parseInt(age),
            height_cm: parseInt(height),
            weight_kg: parseFloat(weight),
            dominant_foot: dominantFoot,
            shoe_size: parseFloat(shoeSize)
          }
        ]);

      if (physicalDataError) throw physicalDataError;

      toast({
        title: "Physical data saved",
        description: "Your physical data has been recorded successfully.",
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving physical data:', error);
      toast({
        title: "Error",
        description: "Failed to save physical data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6">
      <CardHeader>
        <CardTitle>Player Physical Data</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoeSize">Shoe Size</Label>
              <Input
                id="shoeSize"
                type="number"
                step="0.5"
                value={shoeSize}
                onChange={(e) => setShoeSize(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dominant Foot</Label>
            <RadioGroup
              value={dominantFoot}
              onValueChange={(value: 'left' | 'right' | 'both') => setDominantFoot(value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="left" id="left" />
                <Label htmlFor="left">Left</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="right" id="right" />
                <Label htmlFor="right">Right</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full">
            Save Physical Data
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PhysicalDataForm;