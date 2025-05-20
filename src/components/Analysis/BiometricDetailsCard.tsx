
import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface BiometricDetailsCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  change: string;
  status?: "good" | "normal" | "warning" | "critical";
  toleranceMin?: number;
  toleranceMax?: number;
  numericValue?: number;
  playerId?: string;
}

const BiometricDetailsCard = ({
  title,
  value,
  icon,
  change,
  status = "normal",
  toleranceMin,
  toleranceMax,
  numericValue,
  playerId
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

  // Calculate percentage for progress bar based on tolerance values
  const calculateProgress = () => {
    if (numericValue === undefined || toleranceMin === undefined || toleranceMax === undefined) {
      // Default progress values based on status
      return status === "good" ? 90 : 
             status === "normal" ? 70 : 
             status === "warning" ? 40 : 20;
    }
    
    // Calculate progress as percentage between min and max
    const range = toleranceMax - toleranceMin;
    const position = numericValue - toleranceMin;
    const percentage = Math.max(0, Math.min(100, (position / range) * 100));
    
    return percentage;
  };

  // Determine tolerance status text
  const getToleranceStatusText = () => {
    if (numericValue === undefined || toleranceMin === undefined || toleranceMax === undefined) {
      return null;
    }
    
    if (numericValue > toleranceMax) {
      return "Above tolerance";
    } else if (numericValue < toleranceMin) {
      return "Below tolerance";
    } else {
      return "Within tolerance";
    }
  };

  const toleranceStatusText = getToleranceStatusText();

  return (
    <Card className={cn(
      "border transition-colors",
      status === "critical" && "border-red-200 shadow-sm",
      status === "warning" && "border-amber-200 shadow-sm"
    )}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            <div className="flex items-center mt-1 gap-2">
              <span 
                className={cn(
                  "text-xs font-medium",
                  isPositiveChange ? "text-green-600" : "text-red-600"
                )}
              >
                {change}
              </span>
              
              {toleranceStatusText && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  status === "good" ? "bg-green-100 text-green-800" :
                  status === "normal" ? "bg-blue-100 text-blue-800" :
                  status === "warning" ? "bg-amber-100 text-amber-800" :
                  "bg-red-100 text-red-800"
                )}>
                  {toleranceStatusText}
                </span>
              )}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={cn("p-2 rounded-full", getStatusColor())}>
                  {icon}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {toleranceMin !== undefined && toleranceMax !== undefined ? (
                  <p>Tolerance range: {toleranceMin} - {toleranceMax}</p>
                ) : (
                  <p>Status: {status}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-4">
          <Progress 
            value={calculateProgress()} 
            className="h-2 w-full" 
            indicatorClassName={cn(
              {
                "bg-green-500": status === "good",
                "bg-blue-500": status === "normal",
                "bg-amber-500": status === "warning",
                "bg-red-500": status === "critical"
              }
            )} 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default BiometricDetailsCard;
