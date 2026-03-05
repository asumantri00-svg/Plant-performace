import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Factory, 
  Droplets, 
  Zap, 
  Thermometer, 
  Clock, 
  AlertTriangle,
  Beaker,
  Calendar as CalendarIcon,
  ChevronRight,
  Menu
} from 'lucide-react';
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
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import Gauge from './components/Gauge';
import ProductionGauge from './components/ProductionGauge';
import UtilityDonut from './components/UtilityDonut';
import ChatBot from './components/ChatBot';

interface Plant {
  id: string;
  name: string;
}

interface PerformanceData {
  id: number;
  plant_id: string;
  date: string;
  rbd_po_yield: number;
  pfad_yield: number;
  total_production: number;
  target_production: number;
  electrical_consumption: number;
  steam_consumption: number;
  cng_consumption: number;
  demin_water: number;
  soft_water: number;
  solar_consumption: number;
  bleaching_earth: number;
  phosphoric_acid: number;
  efficiency: number;
  utilization: number;
  downtime_hours: number;
  working_hours: number;
}

export default function App() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string>('refinery_1');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [currentData, setCurrentData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('FMCP');
  const [utilityTrendFilter, setUtilityTrendFilter] = useState<string>('electrical');

  const getGrades = (plantId: string) => {
    if (plantId.startsWith('refinery')) {
      return ['FMCP', 'FMCP RSG', 'KMCP', 'KMSC', 'LGE 1ST REFINE', 'PORAM', 'STOP PLANT', 'TOLL SMII'];
    }
    if (plantId === 'ptr') {
      return ['FMCP', 'FMCP RSG', 'KMCP', 'KMSC', 'LGE 1ST REFINE', 'PORAM', 'STOP PLANT', 'RBDPO BIODIESEL'];
    }
    if (plantId.startsWith('fraksinasi')) {
      return ['FMCP', 'KMCP', 'KMSC', 'PORAM', 'STOP PLANT'];
    }
    return ['STANDARD'];
  };

  useEffect(() => {
    const availableGrades = getGrades(selectedPlant);
    if (!availableGrades.includes(selectedGrade)) {
      setSelectedGrade(availableGrades[0]);
    }
  }, [selectedPlant]);

  useEffect(() => {
    fetch('/api/plants')
      .then(res => res.json())
      .then(data => {
        setPlants(data);
        if (data.length > 0) setSelectedPlant(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedPlant) return;
    setLoading(true);
    fetch(`/api/performance/${selectedPlant}`)
      .then(res => res.json())
      .then(data => {
        setPerformanceData(data);
        setCurrentData(data[0] || null);
        setLoading(false);
      });
  }, [selectedPlant]);

  const activePlantName = plants.find(p => p.id === selectedPlant)?.name || 'Plant';

    const getPlantMetrics = () => {
    if (!currentData) return null;
    
    const isStopped = selectedGrade === 'STOP PLANT';
    const stopRemark = selectedGrade === 'STOP PLANT' ? (Math.random() > 0.5 ? "Annual maintenance" : "No planning from PPIC") : null;

    // Grade variation factor
    const gradeHash = selectedGrade.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const gradeFactor = isStopped ? 0 : (0.85 + (gradeHash % 30) / 100);

    const total = isStopped ? 0 : currentData.total_production * gradeFactor;
    
    // Small variation factor based on plant
    const plantFactor = selectedPlant === 'refinery_1' ? 1.0 : 
                        selectedPlant === 'refinery_2' ? 1.02 : 
                        selectedPlant === 'refinery_3' ? 0.98 : 
                        selectedPlant === 'ptr' ? 1.015 : 
                        selectedPlant === 'fraksinasi_1' ? 1.0 :
                        selectedPlant === 'fraksinasi_2' ? 1.01 :
                        selectedPlant === 'fraksinasi_3' ? 0.99 :
                        selectedPlant === 'fraksinasi_3a' ? 1.005 : 1.0;

    // Production Target Variation (65% to 75%)
    const targetBase = 0.65 + (Math.abs((selectedPlant + selectedGrade).split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 11) / 100);
    const productionPercentage = isStopped ? 0 : targetBase * 100;
    const targetTonnage = isStopped ? 0 : total / targetBase;

    let rawIn = { label: 'Raw Material', value: total * 1.05 };
    let products = [{ label: 'Product', value: total, yield: 95 }];
    let chemicals: { label: string; actual: number; budget: number; percent: number }[] = [];
    let quality: { sections: { title: string; items: { label: string; value: any; max: number; isDash?: boolean }[] }[] } | null = null;
    let productionTarget = { percentage: productionPercentage, actual: total, target: targetTonnage };

    const utilityMetrics = isStopped ? [] : (() => {
      let configs: { id: string; title: string; unit: string; budget: number; actual: number }[] = [];
      
      if (selectedPlant.startsWith('refinery') || selectedPlant === 'ptr') {
        configs = [
          { id: 'electrical', title: 'Electrical', unit: 'KWH', budget: 17, actual: 15.99 },
          { id: 'steam', title: 'Steam', unit: 'KG', budget: 60, actual: 68.65 },
          { id: 'cng', title: 'CNG', unit: 'Nm3', budget: 5, actual: 6.01 },
          { id: 'soft_water', title: 'Soft Water', unit: 'M3', budget: 0.05, actual: 0.045 },
          { id: 'solar', title: 'Solar', unit: 'M3', budget: 55.0, actual: 48.2 },
        ];
      } else if (selectedPlant.startsWith('fraksinasi')) {
        configs = [
          { id: 'electrical', title: 'Electrical', unit: 'KWH', budget: 27, actual: 25.59 },
          { id: 'steam', title: 'Steam', unit: 'KG', budget: 40, actual: 28.6 },
          { id: 'soft_water', title: 'Soft Water', unit: 'M3', budget: 0.14, actual: 0.1 },
          { id: 'solar', title: 'Solar', unit: 'M3', budget: 30.0, actual: 22.5 },
        ];
      } else if (selectedPlant === 'biodiesel') {
        configs = [
          { id: 'electrical', title: 'Electrical', unit: 'KWH', budget: 10, actual: 11.6 },
          { id: 'steam', title: 'Steam', unit: 'KG', budget: 525, actual: 240.20 },
          { id: 'water', title: 'Water', unit: 'M3', budget: 0.3, actual: 0.15 },
          { id: 'nitrogen', title: 'Nitrogen', unit: 'M3', budget: 2, actual: 1.56 },
        ];
      } else if (selectedPlant === 'clarification') {
        configs = [
          { id: 'electrical', title: 'Electrical', unit: 'KWH', budget: 3, actual: 1.15 },
          { id: 'water', title: 'Water', unit: 'M3', budget: 0.05, actual: 0.025 },
        ];
      } else if (selectedPlant.startsWith('glycerine')) {
        const glycerineActualFactor = selectedPlant === 'glycerine_1' ? 1.0 : 1.08;
        configs = [
          { id: 'electrical', title: 'Electrical', unit: 'KWH', budget: 85, actual: 75.6 * glycerineActualFactor },
          { id: 'steam', title: 'Steam', unit: 'KG', budget: 1100, actual: 925.62 * glycerineActualFactor },
          { id: 'water', title: 'Water', unit: 'M3', budget: 1, actual: 0.65 * glycerineActualFactor },
        ];
      }

      return configs.map(c => {
        const actual = c.actual * gradeFactor * plantFactor;
        return {
          ...c,
          actual,
          percentage: (actual / c.budget) * 100
        };
      });
    })();

    if (selectedPlant.startsWith('refinery') || selectedPlant === 'ptr') {
      const isPTRBio = selectedPlant === 'ptr' && selectedGrade === 'RBDPO BIODIESEL';
      const rbdYield = isPTRBio ? 98.5 : (currentData.rbd_po_yield + (gradeHash % 5) - 2.5);
      const pfadYield = isPTRBio ? 1.5 : (currentData.pfad_yield + (gradeHash % 2) - 1);
      
      const cpoUsage = isStopped ? 0 : total / ((rbdYield + pfadYield) / 100);
      rawIn = { label: 'CPO Usage', value: cpoUsage };
      products = [
        { label: 'RBDPO', value: total * (rbdYield / (rbdYield + pfadYield)), yield: rbdYield },
        { label: 'PFAD', value: total * (pfadYield / (rbdYield + pfadYield)), yield: pfadYield }
      ];
      chemicals = isStopped ? [] : [
        { label: 'Bleaching Earth', actual: 95.13 * plantFactor * gradeFactor, budget: 100, percent: 95.13 * plantFactor * gradeFactor },
        { label: 'Phosphoric Acid', actual: 78.52 * plantFactor * gradeFactor, budget: 100, percent: 78.52 * plantFactor * gradeFactor }
      ];
      quality = isStopped ? null : {
        sections: [
          {
            title: 'Raw Material (CPO)',
            items: [
              { label: 'FFA CPO', value: 4.70 * plantFactor * gradeFactor, max: 10 },
              { label: 'M & I CPO', value: 0.23 * plantFactor * gradeFactor, max: 1 },
              { label: 'IV CPO', value: 53.24 * plantFactor * gradeFactor, max: 60 },
              { label: 'DOBI CPO', value: 2.55 * plantFactor * gradeFactor, max: 5 },
              { label: 'PV CPO', value: 1.66 * plantFactor * gradeFactor, max: 5 },
              { label: 'COLOR CPO', value: 27.63 * plantFactor * gradeFactor, max: 50 },
              { label: 'ANV CPO', value: 4.62 * plantFactor * gradeFactor, max: 10 },
              { label: 'TOTOX CPO', value: 7.90 * plantFactor * gradeFactor, max: 20 },
              { label: 'CAROTENE CPO', value: 433.58 * plantFactor * gradeFactor, max: 600 },
              { label: 'PC CPO', value: 19.41 * plantFactor * gradeFactor, max: 40 },
            ]
          },
          {
            title: 'Finished Product (RBD PO)',
            items: [
              { label: 'FFA PO', value: 0.042 * plantFactor * gradeFactor, max: 0.1 },
              { label: 'M & I PO', value: 0.020 * plantFactor * gradeFactor, max: 0.05 },
              { label: 'PV PO', value: '-', max: 1, isDash: true },
              { label: 'IV PO', value: 52.38 * plantFactor * gradeFactor, max: 60 },
              { label: 'COLOR PO', value: 1.90 * plantFactor * gradeFactor, max: 5 },
            ]
          }
        ]
      };
    } else if (selectedPlant.startsWith('fraksinasi')) {
      rawIn = { label: 'RBDPO In', value: total };
      products = [
        { label: 'Stearin', value: total * 0.34, yield: 34 },
        { label: 'Olein', value: total * 0.66, yield: 66 }
      ];
      chemicals = [];
      quality = isStopped ? null : {
        sections: [
          {
            title: 'RBD PO',
            items: [
              { label: 'FFA RBD PO', value: 0.04 * plantFactor * gradeFactor, max: 0.1 },
              { label: 'M & I RBD PO', value: 0.02 * plantFactor * gradeFactor, max: 0.05 },
              { label: 'PV RBD PO', value: '-', max: 1, isDash: true },
              { label: 'IV RBD PO', value: 52.67 * plantFactor * gradeFactor, max: 60 },
              { label: 'COLOR RBD PO', value: 1.97 * plantFactor * gradeFactor, max: 5 },
            ]
          },
          {
            title: 'RBD OL',
            items: [
              { label: 'FFA RBD OL', value: 0.05 * plantFactor * gradeFactor, max: 0.1 },
              { label: 'M & I RBD OL', value: 0.02 * plantFactor * gradeFactor, max: 0.05 },
              { label: 'PV RBD OL', value: '-', max: 1, isDash: true },
              { label: 'IV RBD OL', value: 59.71 * plantFactor * gradeFactor, max: 65 },
              { label: 'COLOR RBD OL', value: 2.33 * plantFactor * gradeFactor, max: 5 },
              { label: 'CPT RBD OL', value: 7.22 * plantFactor * gradeFactor, max: 10 },
            ]
          },
          {
            title: 'RBD ST',
            items: [
              { label: 'FFA RBD ST', value: 0.04 * plantFactor * gradeFactor, max: 0.1 },
              { label: 'M & I RBD ST', value: 0.02 * plantFactor * gradeFactor, max: 0.05 },
              { label: 'PV RBD ST', value: '-', max: 1, isDash: true },
              { label: 'IV RBD ST', value: 36.01 * plantFactor * gradeFactor, max: 45 },
              { label: 'CST RBD ST', value: 1.52 * plantFactor * gradeFactor, max: 5 },
            ]
          }
        ]
      };
    } else if (selectedPlant === 'biodiesel') {
      rawIn = { label: 'RBDPO Input', value: total };
      products = [
        { label: 'Crude Fame', value: total * 0.90, yield: 90 },
        { label: 'Crude Glycerine', value: total * 0.09, yield: 9 },
        { label: 'Fatty Matter', value: total * 0.01, yield: 1 }
      ];
      chemicals = [
        { label: 'Phosphoric Acid', actual: 75.12, budget: 100, percent: 75.12 },
        { label: 'HCL', actual: 88.12, budget: 100, percent: 88.12 },
        { label: 'Methanol', actual: 98.58, budget: 100, percent: 98.58 },
        { label: 'Sodium Methylate', actual: 96.22, budget: 100, percent: 96.22 }
      ];
    } else if (selectedPlant.startsWith('glycerine')) {
      rawIn = { label: 'Crude Glycerine In', value: total };
      products = [
        { label: 'USP Glycerine', value: total * 0.7856, yield: 78.56 },
        { label: 'Yellow Glycerine', value: total * 0.025, yield: 2.5 },
        { label: 'Salt', value: total * 0.03, yield: 3 },
        { label: 'Pitch Glycerine', value: total * 0.1594, yield: 15.94 }
      ];
      chemicals = [
        { label: 'NaOH', actual: 97.56, budget: 100, percent: 97.56 }
      ];
    } else if (selectedPlant === 'clarification') {
      rawIn = { label: 'Crude Fame In', value: total / 0.9945 };
      products = [
        { label: 'Fame', value: total, yield: 99.45 }
      ];
      chemicals = [
        { label: 'Filter Aid', actual: 53.89, budget: 100, percent: 53.89 }
      ];
    }

    return { rawIn, products, chemicals, quality, productionTarget, isStopped, stopRemark, utilityMetrics };
  };

  const metrics = getPlantMetrics();

  const trendData = React.useMemo(() => {
    if (!metrics || !metrics.utilityMetrics || performanceData.length === 0) return [];
    
    const selectedUtility = metrics.utilityMetrics.find(u => u.id === utilityTrendFilter);
    if (!selectedUtility) return [];

    const gradeHash = selectedGrade.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    return performanceData.slice(0, 15).reverse().map((d, i) => {
      const dateHash = d.date.split('-').reduce((a, b) => a + parseInt(b), 0);
      // Standardized variation: some days over budget, some under
      const dayFactor = 0.82 + ((dateHash + gradeHash + i) % 45) / 100; 
      const actual = selectedUtility.actual * dayFactor;
      
      return {
        date: d.date,
        actual: actual,
        budget: selectedUtility.budget,
      };
    });
  }, [metrics, utilityTrendFilter, performanceData, selectedGrade]);

  if (loading && plants.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f1f5f9] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="bg-[#1e293b] text-slate-300 flex flex-col shadow-xl z-30"
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
            <Factory size={20} />
          </div>
          {sidebarOpen && <span className="font-bold text-lg text-white tracking-tight">Sinar Mas</span>}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <div className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {sidebarOpen ? 'Plant Units' : 'Units'}
          </div>
          {plants.map((plant) => (
            <button
              key={plant.id}
              onClick={() => setSelectedPlant(plant.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-slate-800 group relative ${
                selectedPlant === plant.id ? 'bg-slate-800 text-emerald-400 border-r-4 border-emerald-500' : ''
              }`}
            >
              <ChevronRight size={16} className={`shrink-0 transition-transform ${selectedPlant === plant.id ? 'rotate-90' : ''}`} />
              {sidebarOpen && <span className="text-sm font-medium truncate">{plant.name}</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {plant.name}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight flex items-center gap-3">
                REPORT PLANT {activePlantName}
              </h1>
              <p className="text-sm text-slate-500 font-medium">Performance Monitoring System</p>
            </div>
            
            {(selectedPlant.startsWith('refinery') || selectedPlant === 'ptr' || selectedPlant.startsWith('fraksinasi')) && (
              <div className="flex flex-col">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Grade</label>
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                >
                  {getGrades(selectedPlant).map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700">{format(new Date(), 'EEEE, dd MMMM yyyy')}</span>
              <span className="text-xs text-slate-400">Shift A - Day Operation</span>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
              <CalendarIcon size={20} />
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {metrics?.isStopped && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-4 text-rose-800"
            >
              <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Plant Stopped</h2>
                <p className="text-sm font-bold opacity-80">Remark: {metrics.stopRemark}</p>
              </div>
            </motion.div>
          )}

          {/* Top Row: Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Production Yield</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Droplets size={18} /></div>
              </div>
              <div className="space-y-4">
                {metrics?.products.map((prod, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-slate-500">{prod.label}</span>
                      <span className="text-xl font-bold text-slate-800">{(prod.yield ?? 0).toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                      <div 
                        className={cn("h-full rounded-full", idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-orange-500" : "bg-indigo-500")} 
                        style={{ width: `${prod.yield}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Material Balance (Ton)</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Factory size={18} /></div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Raw In</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">{metrics?.rawIn.label}</span>
                    <span className="text-sm font-black text-slate-900">{metrics?.rawIn.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600/60 uppercase mb-1">Products Out</p>
                  <div className="space-y-1">
                    {metrics?.products.map((prod, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">{prod.label}</span>
                        <span className="text-sm font-black text-emerald-700">{prod.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-around">
              <Gauge value={currentData?.efficiency || 0} label="Efficiency" subLabel="Overall" color="#10b981" />
              <Gauge value={currentData?.utilization || 0} label="Utilization" subLabel="Plant" color="#6366f1" />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Metrics</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={18} /></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Working Hours</span>
                  <span className="text-lg font-bold text-slate-800">{currentData?.working_hours?.toFixed(2) ?? '0.00'} Hr</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Downtime</span>
                  <span className="text-lg font-bold text-red-500">{currentData?.downtime_hours?.toFixed(2) ?? '0.00'} Hr</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Status</p>
                  <p className="text-xs text-emerald-600 font-bold">NORMAL OPERATION</p>
                </div>
              </div>
            </div>
          </div>

          {/* Utility Consumption Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Zap size={20} />
              </div>
              <h3 className="text-lg font-black text-[#001f3f] uppercase tracking-tight">Utility Consumption</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {metrics?.utilityMetrics.map((util, idx) => (
                <UtilityDonut 
                  key={idx}
                  title={util.title}
                  unit={util.unit}
                  actual={util.actual}
                  budget={util.budget}
                  percentage={util.percentage}
                />
              ))}
            </div>
          </div>

          {/* Middle Row: Consumption & Production Target */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Production Target Achievement</h3>
              {metrics?.productionTarget && (
                <ProductionGauge 
                  percentage={metrics.productionTarget.percentage} 
                  actual={metrics.productionTarget.actual} 
                  target={metrics.productionTarget.target} 
                />
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Utility Consumption Trends</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 overflow-x-auto scrollbar-hide">
                  {metrics?.utilityMetrics.map((util) => (
                    <button
                      key={util.id}
                      onClick={() => setUtilityTrendFilter(util.id)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all whitespace-nowrap",
                        utilityTrendFilter === util.id 
                          ? "bg-white text-emerald-600 shadow-sm" 
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {util.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'dd MMM')} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [value.toFixed(2), 'Value']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorActual)" 
                      strokeWidth={3}
                      name="Actual"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      strokeWidth={2}
                      dot={false}
                      name="Budget"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Chemical Consumption (Actual vs Budget)</h3>
              <div className="space-y-6">
                {metrics?.chemicals && metrics.chemicals.length > 0 ? (
                  metrics.chemicals.map((chem, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                        <Zap size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-500">{chem.label}</span>
                          <span className={cn("font-black", chem.percent > 95 ? "text-amber-600" : "text-emerald-600")}>
                            {(chem.percent ?? 0).toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-500", 
                              chem.percent > 95 ? "bg-amber-500" : "bg-emerald-500"
                            )} 
                            style={{ width: `${chem.percent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 mt-1 uppercase font-bold">
                          <span>Actual: {(chem.actual ?? 0).toFixed(2)}</span>
                          <span>Budget: {(chem.budget ?? 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Droplets size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-medium">No chemical usage recorded</p>
                  </div>
                )}
                
                {metrics?.chemicals && metrics.chemicals.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-black uppercase">Usage Status</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {metrics.chemicals.some(c => c.percent > 95) 
                        ? "Some chemicals are approaching budget limits. Monitor closely."
                        : "Chemical consumption is within optimal budget range."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Production History & Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Daily Production History (Last 15 Days)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData.slice(0, 15).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'dd MMM')} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total_production" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {metrics?.quality && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6 bg-emerald-100/50 p-2 rounded-xl border border-emerald-200">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Beaker size={16} />
                  </div>
                  <h3 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Quality Control</h3>
                </div>
                
                <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
                  {metrics.quality.sections.map((section, sIdx) => (
                    <div key={sIdx}>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest border-b border-slate-100 pb-1">{section.title}</h4>
                      <div className="space-y-2">
                        {section.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-[9px] font-bold text-slate-500 w-24 truncate">{item.label}</span>
                            <div className="flex-1 bg-slate-100 h-2.5 rounded-sm relative overflow-hidden">
                              {!item.isDash && (
                                <div 
                                  className={cn("h-full bg-gradient-to-r rounded-sm", sIdx % 2 === 0 ? "from-emerald-400 to-emerald-600" : "from-blue-400 to-blue-600")} 
                                  style={{ width: `${(item.value / item.max) * 100}%` }}
                                ></div>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-slate-800 w-12 text-right">
                              {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ChatBot Component */}
      <ChatBot performanceData={performanceData} />
    </div>
  );
}
