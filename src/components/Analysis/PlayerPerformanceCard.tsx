
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

interface PlayerPerformanceCardProps {
  player: {
    id: string;
    name: string;
    position?: string;
  };
}

const PlayerPerformanceCard = ({ player }: PlayerPerformanceCardProps) => {
  // Simulated player attributes data
  const attributes = [
    { name: 'Speed', value: Math.floor(Math.random() * 100) },
    { name: 'Endurance', value: Math.floor(Math.random() * 100) },
    { name: 'Technique', value: Math.floor(Math.random() * 100) },
    { name: 'Accuracy', value: Math.floor(Math.random() * 100) },
    { name: 'Power', value: Math.floor(Math.random() * 100) },
    { name: 'Agility', value: Math.floor(Math.random() * 100) },
  ];

  const recentPerformance = [
    { game: 'vs. Team A', score: Math.floor(Math.random() * 100) },
    { game: 'vs. Team B', score: Math.floor(Math.random() * 100) },
    { game: 'vs. Team C', score: Math.floor(Math.random() * 100) },
  ];
  
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
