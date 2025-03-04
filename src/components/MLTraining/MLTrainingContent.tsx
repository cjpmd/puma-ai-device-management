
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainingTabs } from "./TrainingTabs";
import { SessionProvider } from "./SessionContext";
import { TrainingStats } from "./MLTrainingContext";

interface MLTrainingContentProps {
  onTrainingProgress: (stats: TrainingStats) => void;
}

export const MLTrainingContent = ({ onTrainingProgress }: MLTrainingContentProps) => {
  return (
    <SessionProvider onTrainingProgress={onTrainingProgress}>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>ML Training Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TrainingTabs />
        </CardContent>
      </Card>
    </SessionProvider>
  );
};
