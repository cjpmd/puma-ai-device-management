
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, Droplet, Thermometer, Wind, Activity, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface BiometricSummaryData {
  playerId: string;
  playerName: string;
  heartRate: number;
  hydration: number;
  lacticAcid: number;
  vo2Max: number;
  muscleFatigue: number;
  status: "good" | "warning" | "critical";
}

interface TeamSummaryProps {
  players: BiometricSummaryData[];
  sessionType: "training" | "match";
}

const TeamSummary = ({ players, sessionType }: TeamSummaryProps) => {
  // Calculate team averages
  const averages = players.reduce((acc, player) => {
    return {
      heartRate: acc.heartRate + player.heartRate,
      hydration: acc.hydration + player.hydration,
      lacticAcid: acc.lacticAcid + player.lacticAcid,
      vo2Max: acc.vo2Max + player.vo2Max,
      muscleFatigue: acc.muscleFatigue + player.muscleFatigue
    };
  }, {
    heartRate: 0,
    hydration: 0,
    lacticAcid: 0,
    vo2Max: 0,
    muscleFatigue: 0
  });
  
  const playerCount = players.length;
  if (playerCount > 0) {
    averages.heartRate = Math.round(averages.heartRate / playerCount);
    averages.hydration = Math.round(averages.hydration / playerCount);
    averages.lacticAcid = +(averages.lacticAcid / playerCount).toFixed(1);
    averages.vo2Max = Math.round(averages.vo2Max / playerCount);
    averages.muscleFatigue = Math.round(averages.muscleFatigue / playerCount);
  }
  
  // Get status counts
  const statusCounts = players.reduce((acc, player) => {
    acc[player.status] = (acc[player.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Team Biometric Summary</CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={sessionType === "training" ? "secondary" : "default"}>
            {sessionType === "training" ? "Training" : "Match"}
          </Badge>
          <div className="text-sm text-muted-foreground">
            {players.length} Players
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Status Summary */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Team Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-green-600">{statusCounts.good || 0}</div>
                  <div className="text-sm text-muted-foreground">Good</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-amber-600">{statusCounts.warning || 0}</div>
                  <div className="text-sm text-muted-foreground">Warning</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-red-600">{statusCounts.critical || 0}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Team Average Metrics */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Team Averages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <HeartPulse className="h-4 w-4 text-red-500" />
                  <span className="w-24">Heart Rate:</span>
                  <span className="font-medium">{averages.heartRate} bpm</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Droplet className="h-4 w-4 text-blue-500" />
                  <span className="w-24">Hydration:</span>
                  <span className="font-medium">{averages.hydration}%</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Thermometer className="h-4 w-4 text-purple-500" />
                  <span className="w-24">Lactic Acid:</span>
                  <span className="font-medium">{averages.lacticAcid} mmol/L</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6">
          <h3 className="font-medium mb-3">Player Status Overview</h3>
          <div className="space-y-3">
            {players.map((player) => (
              <div key={player.playerId} className="flex items-center">
                <div className="w-1/4 truncate">{player.playerName}</div>
                <div className="w-3/4 flex items-center space-x-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    player.status === "good" ? "bg-green-500" :
                    player.status === "warning" ? "bg-amber-500" :
                    "bg-red-500"
                  )}></div>
                  <Progress 
                    value={player.hydration} 
                    className="h-2" 
                    indicatorClassName={
                      player.hydration < 80 ? "bg-red-500" : 
                      player.hydration < 90 ? "bg-amber-500" : 
                      "bg-green-500"
                    } 
                  />
                  
                  <div className="flex items-center gap-1">
                    <HeartPulse className="h-3 w-3 text-red-500" />
                    <span className="text-xs">{player.heartRate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-blue-500" />
                    <span className="text-xs">{player.hydration}%</span>
                  </div>
                  
                  {player.status === "warning" && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 text-xs">
                      Warning
                    </Badge>
                  )}
                  
                  {player.status === "critical" && (
                    <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamSummary;
