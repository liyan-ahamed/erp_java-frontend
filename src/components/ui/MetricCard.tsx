import React, { ReactNode } from 'react';
import Link from 'next/link';

interface MetricCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Short text shown in Forma's delta chip next to the value. */
  delta?: ReactNode;
  subtitle?: string;
  /** Makes the whole card a link to this route. */
  href?: string;
}

/** Forma metric card: label + icon tile, large value with optional delta chip, muted caption. */
export const MetricCard = ({ title, value, icon, trend, delta, subtitle, href }: MetricCardProps) => {
  const body = (
    <>
      <div className="metric-top">
        <span className="truncate">{title}</span>
        {icon && <span className="metric-icon [&_svg]:!w-[18px] [&_svg]:!h-[18px]">{icon}</span>}
      </div>
      <div className="metric-value">
        {value}
        {trend && (
          <span className="delta">
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
        {delta && <span className="delta">{delta}</span>}
      </div>
      {subtitle && <p className="metric-sub">{subtitle}</p>}
    </>
  );

  if (!href) return <div className="metric">{body}</div>;
  return (
    <Link href={href} className="metric block cursor-pointer transition-colors hover:border-line-strong">
      {body}
    </Link>
  );
};

/** Forma metric grid: four columns, two at ≤980 px. */
export const MetricGrid = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`metrics ${className}`}>{children}</div>
);
