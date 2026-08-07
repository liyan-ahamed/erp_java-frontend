import React, { ReactNode } from 'react';
import { Card, CardContent } from './Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export const MetricCard = ({ title, value, icon, trend, subtitle }: MetricCardProps) => {
  return (
    <Card>
      <CardContent className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-[#111111]">{title}</p>
          {icon && (
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#FAFAFA] border border-[#E8E8E8] text-[#111111]">
              {icon}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          <h4 className="text-2xl font-bold text-[#111111] tracking-tight">{value}</h4>
          {trend && (
            <span
              className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                trend.isPositive ? 'text-[#666666]' : 'text-[#666666]'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-[#9A9A9A] mt-2">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
