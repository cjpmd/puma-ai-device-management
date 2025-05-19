
import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const positionGroups = {
  'Goalkeepers': ['Goalkeeper'],
  'Defenders': ['Center Back', 'Left Back', 'Right Back', 'Wing Back'],
  'Midfielders': ['Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder', 'Left Midfielder', 'Right Midfielder'],
  'Forwards': ['Striker', 'Left Forward', 'Right Forward', 'Center Forward']
};

type GroupName = keyof typeof positionGroups;

interface PositionGroupSelectorProps {
  onSelectionChange: (selection: string[]) => void;
}

const PositionGroupSelector = ({ onSelectionChange }: PositionGroupSelectorProps) => {
  const [selectedGroup, setSelectedGroup] = useState<GroupName | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  const handleGroupSelect = (value: string) => {
    const group = value as GroupName;
    setSelectedGroup(group);
    
    // When selecting a group, auto-select all positions in that group
    setSelectedPositions(positionGroups[group]);
    onSelectionChange(positionGroups[group]);
  };

  const handlePositionToggle = (position: string) => {
    let newSelection: string[];
    
    if (selectedPositions.includes(position)) {
      newSelection = selectedPositions.filter(pos => pos !== position);
    } else {
      newSelection = [...selectedPositions, position];
    }
    
    setSelectedPositions(newSelection);
    onSelectionChange(newSelection);
  };

  const selectAllInGroup = () => {
    if (!selectedGroup) return;
    
    setSelectedPositions(positionGroups[selectedGroup]);
    onSelectionChange(positionGroups[selectedGroup]);
  };
  
  const clearSelection = () => {
    setSelectedPositions([]);
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      <Select onValueChange={handleGroupSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select position group" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(positionGroups).map((group) => (
            <SelectItem key={group} value={group}>
              {group}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedGroup && (
        <Accordion type="single" collapsible defaultValue="positions">
          <AccordionItem value="positions">
            <AccordionTrigger>Position Selection</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllInGroup}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {positionGroups[selectedGroup].map(position => (
                    <div key={position} className="flex items-center space-x-2">
                      <Checkbox 
                        id={position} 
                        checked={selectedPositions.includes(position)}
                        onCheckedChange={() => handlePositionToggle(position)}
                      />
                      <Label htmlFor={position}>{position}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      {selectedPositions.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedPositions.length} position{selectedPositions.length !== 1 && 's'} selected
        </div>
      )}
    </div>
  );
};

export default PositionGroupSelector;
