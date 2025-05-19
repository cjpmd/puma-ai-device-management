
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import MultiPlayerSelector from './MultiPlayerSelector';
import PositionGroupSelector from './PositionGroupSelector';
import GroupAnalysisCard from './GroupAnalysisCard';

interface Player {
  id: string;
  name: string;
  position?: string;
}

const GroupSelectionTab = () => {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectionMethod, setSelectionMethod] = useState<'players' | 'positions'>('players');

  const handlePlayerSelectionChange = (players: Player[]) => {
    setSelectedPlayers(players);
    setSelectionMethod('players');
  };

  const handlePositionSelectionChange = (positions: string[]) => {
    setSelectedPositions(positions);
    
    // For demo purposes, we'll simulate fetching players by position
    // In a real app, you would fetch players from the database based on position
    if (positions.length > 0) {
      const samplePlayers: Player[] = [
        { id: '3', name: 'Jamie Wilson', position: 'Defender' },
        { id: '7', name: 'Jordan Thompson', position: 'Defender' },
        { id: '2', name: 'Casey Smith', position: 'Midfielder' },
        { id: '6', name: 'Riley Clark', position: 'Midfielder' },
        { id: '1', name: 'Alex Johnson', position: 'Forward' },
        { id: '5', name: 'Morgan Lee', position: 'Forward' },
        { id: '8', name: 'Parker Evans', position: 'Forward' },
        { id: '4', name: 'Taylor Roberts', position: 'Goalkeeper' },
      ];
      
      // Filter players by the selected positions
      const filteredPlayers = samplePlayers.filter(player => 
        positions.some(pos => player.position?.includes(pos.split(' ')[0]))
      );
      
      setSelectedPlayers(filteredPlayers);
      setSelectionMethod('positions');
    } else {
      setSelectedPlayers([]);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players">Select Players</TabsTrigger>
          <TabsTrigger value="positions">Select by Position</TabsTrigger>
        </TabsList>
        <TabsContent value="players" className="space-y-4 mt-4">
          <MultiPlayerSelector 
            onSelectionChange={handlePlayerSelectionChange}
            selectedPlayerIds={selectedPlayers.map(p => p.id)}
          />
        </TabsContent>
        <TabsContent value="positions" className="space-y-4 mt-4">
          <PositionGroupSelector onSelectionChange={handlePositionSelectionChange} />
        </TabsContent>
      </Tabs>

      {selectedPlayers.length > 0 ? (
        <GroupAnalysisCard 
          title={
            selectionMethod === 'positions' 
              ? `Group Analysis: ${selectedPositions.join(', ')}` 
              : "Selected Players Analysis"
          }
          players={selectedPlayers}
        />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-72">
            <p className="text-muted-foreground">
              Select players or positions to view group analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroupSelectionTab;
