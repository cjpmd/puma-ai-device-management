
import { useState } from 'react';
import PlayerSelector from './PlayerSelector';
import PlayerPerformanceCard from './PlayerPerformanceCard';
import { Card, CardContent } from "@/components/ui/card";

interface Player {
  id: string;
  name: string;
  position?: string;
}

const IndividualPlayerTab = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-md mb-8">
        <PlayerSelector 
          onPlayerSelect={handlePlayerSelect} 
          selectedPlayerId={selectedPlayer?.id}
        />
      </div>

      {selectedPlayer ? (
        <PlayerPerformanceCard player={selectedPlayer} />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-72">
            <p className="text-muted-foreground">
              Select a player to view their performance analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IndividualPlayerTab;
