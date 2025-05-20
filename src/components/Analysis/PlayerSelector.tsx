
import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem 
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Player {
  id: string;
  name: string;
  position?: string;
  player_type?: string; // Added this field since it might be useful for displaying positions
}

interface PlayerSelectorProps {
  onPlayerSelect: (player: Player) => void;
  selectedPlayerId?: string;
}

const PlayerSelector = ({ onPlayerSelect, selectedPlayerId }: PlayerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        // Fetch players from the database
        const { data, error } = await supabase
          .from('players')
          .select('id, name, player_type')
          .order('name');
          
        if (error) throw error;
        
        // If no data in the players table, use sample data for demo
        if (!data || data.length === 0) {
          setPlayers([
            { id: '1', name: 'Alex Johnson', position: 'Forward' },
            { id: '2', name: 'Casey Smith', position: 'Midfielder' },
            { id: '3', name: 'Jamie Wilson', position: 'Defender' },
            { id: '4', name: 'Taylor Roberts', position: 'Goalkeeper' },
            { id: '5', name: 'Morgan Lee', position: 'Forward' },
          ]);
        } else {
          // Map player_type to position for display purposes
          const mappedPlayers = data.map(player => ({
            id: player.id,
            name: player.name,
            position: player.player_type === 'GOALKEEPER' ? 'Goalkeeper' : 
                    player.player_type === 'OUTFIELD' ? 'Outfield' : player.player_type
          }));
          setPlayers(mappedPlayers);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        // Use sample data as fallback
        setPlayers([
          { id: '1', name: 'Alex Johnson', position: 'Forward' },
          { id: '2', name: 'Casey Smith', position: 'Midfielder' },
          { id: '3', name: 'Jamie Wilson', position: 'Defender' },
          { id: '4', name: 'Taylor Roberts', position: 'Goalkeeper' },
          { id: '5', name: 'Morgan Lee', position: 'Forward' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const selectedPlayer = players.find(player => player.id === selectedPlayerId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={loading}
        >
          {selectedPlayer ? selectedPlayer.name : "Select player..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search player..." />
          <CommandEmpty>No player found.</CommandEmpty>
          <CommandGroup>
            {players.map((player) => (
              <CommandItem
                key={player.id}
                value={player.name}
                onSelect={() => {
                  onPlayerSelect(player);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedPlayerId === player.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span>{player.name}</span>
                {player.position && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {player.position}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PlayerSelector;
