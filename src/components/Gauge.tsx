import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeProps {
  value: number;
  label: string;
  subLabel?: string;
  color?: string;
  size?: number;
}

export default function Gauge({ value, label, subLabel, color = "#10b981", size = 120 }: GaugeProps) {
  const isOverTarget = value > 100;
  const fillColor = isOverTarget ? '#EEB348' : 'url(#gaugeGradient)';

  const data = [
    { value: Math.min(value, 100) },
    { value: Math.max(0, 100 - value) },
  ];

  return (
    <div className="flex flex-col items-center justify-center">
      <div style={{ width: size, height: size }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="gaugeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#53E372" />
                <stop offset="100%" stopColor="#F1F77D" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="90%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={fillColor} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-800">
            {typeof value === 'number' ? value.toFixed(2) : '0.00'}%
          </span>
          {subLabel && <span className="text-[10px] text-slate-500 uppercase font-semibold">{subLabel}</span>}
        </div>
      </div>
      <span className="text-xs font-medium text-slate-600 mt-1">{label}</span>
    </div>
  );
}
