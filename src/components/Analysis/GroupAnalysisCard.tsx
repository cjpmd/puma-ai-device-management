
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

interface GroupAnalysisCardProps {
  title: string;
  players: Array<{
    id: string;
    name: string;
    position?: string;
  }>;
}

const GroupAnalysisCard = ({ title, players }: GroupAnalysisCardProps) => {
  // Simulated group metrics
  const generateMetrics = () => {
    const metrics = ['Speed', 'Endurance', 'Technique', 'Accuracy', 'Power', 'Agility'];
    
    return metrics.map(metric => {
      const result: any = { name: metric };
      
      players.forEach(player => {
        // Generate a random value for each player and metric
        result[player.name] = Math.floor(Math.random() * 100);
      });
      
      return result;
    });
  };

  const groupMetrics = generateMetrics();
  
  // Generate colors for each player
  const getPlayerColors = () => {
    const colors = ['#0F766E', '#EAB308', '#8B5CF6', '#EC4899', '#F97316', '#84CC16'];
    
    return players.map((player, index) => ({
      player: player.name,
      color: colors[index % colors.length]
    }));
  };
  
  const playerColors = getPlayerColors();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="text-sm text-muted-foreground">
          {players.length} player{players.length !== 1 && 's'}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupMetrics}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              {players.map((player, index) => (
                <Bar 
                  key={player.id}
                  dataKey={player.name} 
                  fill={playerColors[index].color} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-2 mt-4">
          <h4 className="font-medium">Group Performance Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Average Speed</span>
                <span>{Math.floor(Math.random() * 30 + 70)}/100</span>
              </div>
              <Progress value={Math.floor(Math.random() * 30 + 70)} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Average Endurance</span>
                <span>{Math.floor(Math.random() * 30 + 70)}/100</span>
              </div>
              <Progress value={Math.floor(Math.random() * 30 + 70)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupAnalysisCard;
