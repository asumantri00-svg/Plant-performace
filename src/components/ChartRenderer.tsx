import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  title: string;
  xAxis: string;
  yAxis: string;
  data: any[];
}

export default function ChartRenderer({ chart }: { chart: ChartData }) {
  const renderChart = () => {
    switch (chart.type) {
      case 'bar':
        return (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{fontSize: 10}} />
            <YAxis tick={{fontSize: 10}} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{fontSize: 10}} />
            <YAxis tick={{fontSize: 10}} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              nameKey="label"
            >
              {chart.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        );
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" dataKey="x" name={chart.xAxis} tick={{fontSize: 10}} />
            <YAxis type="number" dataKey="y" name={chart.yAxis} tick={{fontSize: 10}} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={chart.title} data={chart.data} fill="#8b5cf6" />
          </ScatterChart>
        );
      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Unsupported chart type</div>;
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
      <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-tight">{chart.title}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
