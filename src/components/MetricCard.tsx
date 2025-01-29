import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

const MetricCard = ({ title, value, unit, icon, subtitle }: MetricCardProps) => {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-primary">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
        </div>
        {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
};

export default MetricCard;