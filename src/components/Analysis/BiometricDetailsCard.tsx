
import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BiometricDetailsCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  change: string;
  status?: "good" | "normal" | "warning" | "critical";
}

const BiometricDetailsCard = ({
  title,
  value,
  icon,
  change,
  status = "normal"
}: BiometricDetailsCardProps) => {
  const isPositiveChange = change.startsWith("+");
  
  const getStatusColor = () => {
    switch (status) {
      case "good":
        return "bg-green-50 text-green-600";
      case "normal":
        return "bg-blue-50 text-blue-600";
      case "warning":
        return "bg-amber-50 text-amber-600";
      case "critical":
        return "bg-red-50 text-red-600";
      default:
        return "bg-slate-50 text-slate-600";
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            <div className="flex items-center mt-1">
              <span 
                className={cn(
                  "text-xs font-medium",
                  isPositiveChange ? "text-green-600" : "text-red-600"
                )}
              >
                {change}
              </span>
            </div>
          </div>
          <div className={cn("p-2 rounded-full", getStatusColor())}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full",
                {
                  "bg-green-500": status === "good",
                  "bg-blue-500": status === "normal",
                  "bg-amber-500": status === "warning",
                  "bg-red-500": status === "critical"
                }
              )}
              style={{ 
                width: status === "good" ? '90%' : 
                       status === "normal" ? '70%' : 
                       status === "warning" ? '40%' : '20%' 
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BiometricDetailsCard;
