import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { productionService } from '../services/productionService';
import { ProductionRecord } from '../types/production';
import { 
  Activity, 
  Droplets, 
  Zap, 
  Flame, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';

const Dashboard: React.FC = () => {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>('GLY 2');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await productionService.getRecords();
      setRecords(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const latestRecord = records[records.length - 1] as ProductionRecord || {} as ProductionRecord;
  
  const stats = [
    { 
      label: 'Actual Production', 
      value: `${(latestRecord.refined_glycerine || 0).toLocaleString()} Kg`, 
      icon: Droplets, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      label: 'Yield Rate', 
      value: `${latestRecord.yield_refined_glycerine || 0}%`, 
      icon: TrendingUp, 
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: 'Electricity Usage', 
      value: `${(latestRecord.kwh_electricity || 0).toLocaleString()} Kwh`, 
      icon: Zap, 
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      label: 'Steam Consumption', 
      value: `${(latestRecord.steam_kg || 0).toLocaleString()} Kg`, 
      icon: Flame, 
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Production Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time monitoring for {selectedUnit}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 pr-8"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
          >
            <option value="ref 1">Refinery 1</option>
            <option value="ref 2">Refinery 2</option>
            <option value="ref 3">Refinery 3</option>
            <option value="PTR">PTR</option>
            <option value="FRAK 1">Fractionation 1</option>
            <option value="Frak 2">Fractionation 2</option>
            <option value="Bio">Biodiesel</option>
            <option value="CLR">Clarification</option>
            <option value="GLY">Glycerine 1</option>
            <option value="GLY 2">Glycerine 2</option>
          </select>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4"
          >
            <div className={`${stat.bg} p-3 rounded-xl`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Production Trend (Kg)</h3>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={records}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="record_date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Line 
                  type="monotone" 
                  dataKey="refined_glycerine" 
                  name="Refined" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="crude_glycerin_actual" 
                  name="Crude" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Yield Performance (%)</h3>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={records}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="record_date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="yield_refined_glycerine" name="Yield %" radius={[4, 4, 0, 0]}>
                  {records.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.yield_refined_glycerine && entry.yield_refined_glycerine > 70 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Data Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent Production Logs</h3>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Crude (Kg)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Refined (Kg)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Yield %</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.slice().reverse().map((record, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {record.record_date}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.material}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{(record.crude_glycerin_actual || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{(record.refined_glycerine || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right font-semibold">
                    {record.yield_refined_glycerine}%
                  </td>
                  <td className="px-6 py-4">
                    {record.material === 'stop plant' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <AlertTriangle className="w-3 h-3" /> Stopped
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <Activity className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
