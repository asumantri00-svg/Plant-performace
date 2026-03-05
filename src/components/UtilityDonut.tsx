import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

interface UtilityDonutProps {
  title: string;
  unit: string;
  actual: number;
  budget: number;
  percentage: number;
}

export default function UtilityDonut({ title, unit, actual, budget, percentage }: UtilityDonutProps) {
  const isOverBudget = percentage > 100;
  const gradientId = `grad-${title.replace(/\s+/g, '').toLowerCase()}`;
  
  // We want the circle to represent 100% budget.
  // If over 100%, we show a full circle of the "over budget" color.
  const chartData = isOverBudget 
    ? [{ value: 100 }] 
    : [
        { value: Math.max(0, percentage) },
        { value: Math.max(0, 100 - percentage) }
      ];

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-black text-[#001f3f] mb-4 uppercase tracking-tight">{title}</h3>
      
      <div className="w-40 h-40 relative mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#53E372" />
                <stop offset="100%" stopColor="#F1F77D" />
              </linearGradient>
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
            >
              {chartData.map((entry, index) => {
                let fill;
                if (isOverBudget) {
                  fill = '#EEB348';
                } else {
                  fill = index === 0 ? `url(#${gradientId})` : '#f1f5f9';
                }
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className={cn("text-xl font-black", isOverBudget ? "text-[#EEB348]" : "text-[#001f3f]")}>
              {(percentage ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="bg-emerald-50/50 rounded-lg overflow-hidden border border-emerald-100">
          <div className="bg-white border-b border-emerald-100 py-1 text-center">
            <span className="text-[10px] font-black text-emerald-600 uppercase">{unit}</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-emerald-100">
            <div className="p-2 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Actual</p>
              <p className="text-sm font-black text-slate-800">{(actual ?? 0).toFixed(2)}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Budget</p>
              <p className="text-sm font-black text-slate-800">{(budget ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
