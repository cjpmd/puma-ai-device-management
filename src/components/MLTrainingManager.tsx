
import { MLTrainingProvider, TrainingStats } from "./MLTraining/MLTrainingContext";
import { MLTrainingContent } from "./MLTraining/MLTrainingContent";

interface MLTrainingManagerProps {
  onTrainingProgress: (stats: TrainingStats) => void;
}

// Wrapper component that provides the context
const MLTrainingManager = ({ onTrainingProgress }: MLTrainingManagerProps) => {
  return (
    <MLTrainingProvider onTrainingProgress={onTrainingProgress}>
      <MLTrainingContent onTrainingProgress={onTrainingProgress} />
    </MLTrainingProvider>
  );
};

export default MLTrainingManager;
