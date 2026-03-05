import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ProductionGaugeProps {
  percentage: number;
  actual: number;
  target: number;
}

export default function ProductionGauge({ percentage, actual, target }: ProductionGaugeProps) {
  const isOverTarget = percentage > 100;
  const fillColor = isOverTarget ? '#EEB348' : 'url(#prodGaugeGradient)';

  const data = [
    { value: Math.min(percentage, 100) },
    { value: Math.max(0, 100 - percentage) },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-64 h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="prodGaugeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#53E372" />
                <stop offset="100%" stopColor="#F1F77D" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="65%"
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
            {/* Outer decorative ring with ticks (simulated by a dashed stroke) */}
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="2 4"
              className="opacity-50"
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Central Yellow Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full shadow-inner flex flex-col items-center justify-center border-4 border-white/30">
            <span className="text-2xl font-black text-[#001f3f] leading-none">
              {typeof percentage === 'number' ? percentage.toFixed(2) : '0.00'}%
            </span>
            <span className="text-xs font-bold text-[#001f3f] uppercase tracking-tighter mt-1">Produksi</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 w-full">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Actual Tonnage</p>
          <p className="text-sm font-black text-slate-800">
            {typeof actual === 'number' ? actual.toLocaleString() : '0'} Ton
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Target Budget</p>
          <p className="text-sm font-black text-slate-800">
            {typeof target === 'number' ? target.toLocaleString() : '0'} Ton
          </p>
        </div>
      </div>
    </div>
  );
}
