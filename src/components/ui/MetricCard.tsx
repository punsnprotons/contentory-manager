
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Metric } from "@/types";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  metric: Metric;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, className }) => {
  const isPositiveChange = metric.change >= 0;

  return (
    <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
            <h3 className="text-2xl font-bold mt-1">{metric.value.toLocaleString()}</h3>
            <div className="flex items-center mt-1">
              <span
                className={cn(
                  "flex items-center text-xs font-medium",
                  isPositiveChange ? "text-green-500" : "text-red-500"
                )}
              >
                {isPositiveChange ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {isPositiveChange ? "+" : ""}
                {metric.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>
          {metric.platform === "instagram" ? (
            <div className="h-8 w-8 bg-gradient-to-br from-pink-500 to-yellow-500 rounded-md flex items-center justify-center">
              <Instagram className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="h-8 w-8 bg-blue-500 rounded-md flex items-center justify-center">
              <Twitter className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Instagram = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Twitter = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

export default MetricCard;
