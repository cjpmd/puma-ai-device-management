
import { ActivityType } from '@/ml/activityRecognition';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ActivityTypeSelectorProps {
  currentLabel: ActivityType;
  onLabelChange: (label: ActivityType) => void;
}

const ActivityTypeSelector = ({ currentLabel, onLabelChange }: ActivityTypeSelectorProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Activity Type</h3>
      <RadioGroup
        value={currentLabel}
        onValueChange={(value: ActivityType) => onLabelChange(value)}
        className="flex flex-wrap gap-4"
      >
        {['pass', 'shot', 'dribble', 'touch', 'no_possession'].map((activity) => (
          <div key={activity} className="flex items-center space-x-2">
            <RadioGroupItem value={activity} id={activity} />
            <Label htmlFor={activity}>{activity.replace('_', ' ')}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default ActivityTypeSelector;
