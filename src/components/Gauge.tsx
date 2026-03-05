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
  const data = [
    { value: value },
    { value: 100 - value },
  ];

  return (
    <div className="flex flex-col items-center justify-center">
      <div style={{ width: size, height: size }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="90%"
              startAngle={180}
              endAngle={0}
              paddingAngle={0}
              dataKey="value"
            >
              <Cell fill={color} />
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className="text-xl font-bold text-slate-800">{value.toFixed(2)}%</span>
          {subLabel && <span className="text-[10px] text-slate-500 uppercase font-semibold">{subLabel}</span>}
        </div>
      </div>
      <span className="text-xs font-medium text-slate-600 mt-[-10px]">{label}</span>
    </div>
  );
}
