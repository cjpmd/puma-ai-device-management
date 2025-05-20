
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
} from 'recharts';
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface PlayerPerformanceCardProps {
  player: {
    id: string;
    name: string;
    position?: string;
  };
  sessionId?: string | null;
  isLiveMode?: boolean;
}

const PlayerPerformanceCard = ({ player, sessionId, isLiveMode = true }: PlayerPerformanceCardProps) => {
  const [attributes, setAttributes] = useState([
    { name: 'Speed', value: Math.floor(Math.random() * 100) },
    { name: 'Endurance', value: Math.floor(Math.random() * 100) },
    { name: 'Technique', value: Math.floor(Math.random() * 100) },
    { name: 'Accuracy', value: Math.floor(Math.random() * 100) },
    { name: 'Power', value: Math.floor(Math.random() * 100) },
    { name: 'Agility', value: Math.floor(Math.random() * 100) },
  ]);
  
  const [recentPerformance, setRecentPerformance] = useState([
    { game: 'vs. Team A', score: Math.floor(Math.random() * 100) },
    { game: 'vs. Team B', score: Math.floor(Math.random() * 100) },
    { game: 'vs. Team C', score: Math.floor(Math.random() * 100) },
  ]);
  
  useEffect(() => {
    // If we have a sessionId, we could fetch specific data for that session
    if (sessionId) {
      fetchSessionData(player.id, sessionId);
    }
  }, [player.id, sessionId]);
  
  const fetchSessionData = async (playerId: string, sessionId: string) => {
    try {
      // Here you would fetch real data from Supabase based on the session and player
      const { data, error } = await supabase
        .from('sensor_recordings')
        .select('*')
        .eq('training_session_id', sessionId)
        .limit(50);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Process the data to extract attribute values
        // This is a simplified example - in a real app you'd have more sophisticated processing
        
        // For demo purposes, we'll just use random values slightly influenced by the data length
        const dataFactor = Math.min(data.length / 10, 1); // Scale factor based on data quantity
        
        setAttributes([
          { name: 'Speed', value: Math.floor(65 + Math.random() * 35 * dataFactor) },
          { name: 'Endurance', value: Math.floor(70 + Math.random() * 30 * dataFactor) },
          { name: 'Technique', value: Math.floor(60 + Math.random() * 40 * dataFactor) },
          { name: 'Accuracy', value: Math.floor(55 + Math.random() * 45 * dataFactor) },
          { name: 'Power', value: Math.floor(50 + Math.random() * 50 * dataFactor) },
          { name: 'Agility', value: Math.floor(60 + Math.random() * 40 * dataFactor) },
        ]);
        
        // Update recent performance based on historical data
        setRecentPerformance([
          { game: 'Recent Session', score: Math.floor(75 + Math.random() * 25 * dataFactor) },
          { game: 'Previous Week', score: Math.floor(70 + Math.random() * 30) },
          { game: 'Two Weeks Ago', score: Math.floor(65 + Math.random() * 35) },
        ]);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{player.name}</CardTitle>
        {player.position && (
          <span className="text-muted-foreground">{player.position}</span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={attributes}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis domain={[0, 100]} />
              <Radar
                name="Attributes"
                dataKey="value"
                stroke="#0F766E"
                fill="#0F766E"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Recent Performance</h4>
          {recentPerformance.map((game, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{game.game}</span>
                <span>{game.score}/100</span>
              </div>
              <Progress value={game.score} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerPerformanceCard;
