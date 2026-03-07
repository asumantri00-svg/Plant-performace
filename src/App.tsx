import React, { useState, useEffect, useRef } from 'react';
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
  Menu,
  Plus,
  X,
  FileSpreadsheet
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
import DataUploader from './components/DataUploader';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

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
  const [chemicalTrendFilter, setChemicalTrendFilter] = useState<string>('Bleaching Earth');
  const [qualityTrendFilter, setQualityTrendFilter] = useState<string>('FFA CPO');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'manual' | 'bulk'>('manual');
  const [isSyncing, setIsSyncing] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    if (!selectedPlant) return;
    setLoading(true);
    
    fetch(`/api/performance/${selectedPlant}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setPerformanceData(data);
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          if (!selectedDate || selectedDate === todayStr) {
            setCurrentData(data[0] || null);
            setLoading(false);
          }
        }
      })
      .catch(err => {
        console.error("Failed to fetch performance data:", err);
        setLoading(false);
      });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (selectedDate && selectedDate !== todayStr) {
      fetch(`/api/performance/${selectedPlant}?date=${selectedDate}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setCurrentData(data[0] || null);
            setLoading(false);
          }
        })
        .catch(err => {
          console.error("Failed to fetch date-specific data:", err);
          setLoading(false);
        });
    }
  };

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
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setPlants(data);
          if (data.length > 0) setSelectedPlant(data[0].id);
        }
      })
      .catch(err => console.error("Failed to fetch plants:", err));
  }, []);

  useEffect(() => {
    refreshData();
  }, [selectedPlant, selectedDate]);

  const handleSyncToSupabase = async () => {
    if (!supabase) {
      alert('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.');
      return;
    }

    setIsSyncing(true);
    try {
      // Fetch all local data to sync
      const res = await fetch(`/api/performance/${selectedPlant}`);
      const localData = await res.json();

      if (!Array.isArray(localData) || localData.length === 0) {
        alert('No local data to sync.');
        setIsSyncing(false);
        return;
      }

      // Upsert to Supabase
      const { error } = await supabase
        .from('performance_data')
        .upsert(localData.map(({ id, ...rest }) => ({ ...rest })), { onConflict: 'plant_id,date' });

      if (error) throw error;
      alert('Successfully synced data to Supabase!');
    } catch (error: any) {
      console.error('Sync error:', error);
      alert(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const activePlantName = plants.find(p => p.id === selectedPlant)?.name || 'Plant';

    const getPlantMetrics = () => {
    if (!currentData) return null;
    
    const isStopped = selectedGrade === 'STOP PLANT';
    const stopRemark = selectedGrade === 'STOP PLANT' ? (Math.random() > 0.5 ? "Annual maintenance" : "No planning from PPIC") : null;

    // Grade variation factor
    const gradeHash = (selectedGrade || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
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
    const targetTonnage = isStopped ? 0 : (targetBase > 0 ? total / targetBase : 0);

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
      const rbdYield = isPTRBio ? 98.5 : ((currentData?.rbd_po_yield ?? 90) + (gradeHash % 5) - 2.5);
      const pfadYield = isPTRBio ? 1.5 : ((currentData?.pfad_yield ?? 4) + (gradeHash % 2) - 1);
      
      const totalYield = (rbdYield + pfadYield) / 100;
      const cpoUsage = isStopped ? 0 : (totalYield > 0 ? total / totalYield : 0);
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
      const yieldFactor = 0.9945;
      rawIn = { label: 'Crude Fame In', value: yieldFactor > 0 ? total / yieldFactor : total };
      products = [
        { label: 'Fame', value: total, yield: yieldFactor * 100 }
      ];
      chemicals = [
        { label: 'Filter Aid', actual: 53.89, budget: 100, percent: 53.89 }
      ];
    }

    return { rawIn, products, chemicals, quality, productionTarget, isStopped, stopRemark, utilityMetrics };
  };

  const metrics = getPlantMetrics();

  const trendData = React.useMemo(() => {
    if (!metrics || !metrics.utilityMetrics || !Array.isArray(performanceData) || performanceData.length === 0) return [];
    
    const selectedUtility = metrics.utilityMetrics.find(u => u.id === utilityTrendFilter);
    if (!selectedUtility) return [];

    const gradeHash = (selectedGrade || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    return performanceData.slice(0, 15).reverse().map((d, i) => {
      const dateStr = d.date || '';
      const dateHash = dateStr.split('-').reduce((a, b) => a + (parseInt(b) || 0), 0);
      // Standardized variation: some days over budget, some under
      const dayFactor = 0.82 + ((dateHash + gradeHash + i) % 45) / 100; 
      const actual = selectedUtility.actual * dayFactor;
      
      return {
        date: dateStr, // Keep raw date string for XAxis tickFormatter
        actual: actual,
        budget: selectedUtility.budget,
      };
    });
  }, [metrics, utilityTrendFilter, performanceData, selectedGrade]);

  const chemicalTrendData = React.useMemo(() => {
    if (!metrics || !metrics.chemicals || !Array.isArray(performanceData) || performanceData.length === 0) return [];
    const selectedChem = metrics.chemicals.find(c => c.label === chemicalTrendFilter);
    if (!selectedChem) return [];
    const gradeHash = (selectedGrade || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return performanceData.slice(0, 15).reverse().map((d, i) => {
      const dateStr = d.date || '';
      const dateHash = dateStr.split('-').reduce((a, b) => a + (parseInt(b) || 0), 0);
      const dayFactor = 0.85 + ((dateHash + gradeHash + i) % 35) / 100;
      return {
        date: dateStr, // Keep raw date string
        actual: selectedChem.actual * dayFactor,
        budget: selectedChem.budget,
      };
    });
  }, [metrics, chemicalTrendFilter, performanceData, selectedGrade]);

  const qualityTrendData = React.useMemo(() => {
    if (!metrics || !metrics.quality || !Array.isArray(performanceData) || performanceData.length === 0) return [];
    const allItems = metrics.quality.sections.flatMap(s => s.items);
    const selectedItem = allItems.find(item => item.label === qualityTrendFilter);
    if (!selectedItem || typeof selectedItem.value !== 'number') return [];
    const gradeHash = (selectedGrade || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return performanceData.slice(0, 15).reverse().map((d, i) => {
      const dateStr = d.date || '';
      const dateHash = dateStr.split('-').reduce((a, b) => a + (parseInt(b) || 0), 0);
      const dayFactor = 0.95 + ((dateHash + gradeHash + i) % 15) / 100; 
      return {
        date: dateStr, // Keep raw date string
        value: selectedItem.value * dayFactor,
        max: selectedItem.max,
      };
    });
  }, [metrics, qualityTrendFilter, performanceData, selectedGrade]);

  const safeFormat = (date: string | Date | null | undefined, formatStr: string, fallback: string = 'N/A') => {
    if (!date) return fallback;
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return fallback;
      return format(d, formatStr);
    } catch (e) {
      return fallback;
    }
  };

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
          {sidebarOpen && <span className="font-bold text-lg text-white tracking-tight">SABAR MAS</span>}
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
            {isSupabaseConfigured() ? (
              <button
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
                <span>SYNC SUPABASE</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed" title="Supabase not configured">
                <CloudOff size={18} />
                <span>SYNC SUPABASE</span>
              </div>
            )}
            <DataUploader plants={plants} onUploadSuccess={refreshData} />
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all"
            >
              <Plus size={18} />
              <span>MANUAL INPUT</span>
            </button>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700">{safeFormat(selectedDate, 'EEEE, dd MMMM yyyy')}</span>
              <span className="text-xs text-slate-400">Shift A - Day Operation</span>
            </div>
            <div 
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors relative"
              onClick={() => dateInputRef.current?.showPicker()}
            >
              <CalendarIcon size={20} />
              <input 
                ref={dateInputRef}
                type="date" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => setSelectedDate(e.target.value)}
                value={selectedDate}
              />
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {!loading && !currentData && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-amber-50 border border-amber-200 p-12 rounded-3xl flex flex-col items-center justify-center text-amber-800 text-center"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-500">
                <CalendarIcon size={40} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-2">No Data Found</h2>
              <p className="text-slate-600 font-medium max-w-md">
                There is no performance record available for <span className="font-bold text-amber-700">{selectedDate ? safeFormat(selectedDate, 'EEEE, dd MMMM yyyy') : 'the selected date'}</span>. 
                Please select another date from the calendar.
              </p>
            </motion.div>
          )}

          {metrics ? (
            <>
              {metrics.isStopped && (
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
                    <span className="text-sm font-black text-slate-900">
                      {typeof metrics?.rawIn.value === 'number' 
                        ? metrics.rawIn.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                        : '0.00'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600/60 uppercase mb-1">Products Out</p>
                  <div className="space-y-1">
                    {metrics?.products.map((prod, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">{prod.label}</span>
                        <span className="text-sm font-black text-emerald-700">
                          {typeof prod.value === 'number' 
                            ? prod.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                            : '0.00'}
                        </span>
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
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => safeFormat(val, 'dd MMM')} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : '0.00', 'Value']}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Daily Production History (Last 15 Days)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData.slice(0, 15).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => safeFormat(val, 'dd MMM')} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : '0.00', 'Ton']}
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

          {/* New Trends Row: Chemical & Quality Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Chemical Consumption Trends</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 overflow-x-auto scrollbar-hide">
                  {metrics?.chemicals?.map((chem) => (
                    <button
                      key={chem.label}
                      onClick={() => setChemicalTrendFilter(chem.label)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all whitespace-nowrap",
                        chemicalTrendFilter === chem.label 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {chem.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chemicalTrendData}>
                    <defs>
                      <linearGradient id="colorChem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => safeFormat(val, 'dd MMM')} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : '0.00', 'Value']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorChem)" 
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Quality Parameter Trends</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 overflow-x-auto scrollbar-hide">
                  {['FFA CPO', 'M & I CPO', 'TOTOX CPO', 'FFA PO', 'COLOR PO'].map((label) => (
                    <button
                      key={label}
                      onClick={() => setQualityTrendFilter(label)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all whitespace-nowrap",
                        qualityTrendFilter === label 
                          ? "bg-white text-amber-600 shadow-sm" 
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={qualityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => safeFormat(val, 'dd MMM')} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : '0.00', 'Value']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="Value"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="max" 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      strokeWidth={2}
                      dot={false}
                      name="Limit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        !loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            {/* No Data message already shown above */}
          </div>
        )
      )}
    </div>
  </main>

      {/* Supabase Input Modal */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Input New Performance Data</h2>
                <p className="text-xs text-slate-500 font-bold uppercase">Sync with Supabase</p>
              </div>
              <button 
                onClick={() => {
                  setIsSupabaseModalOpen(false);
                  setSupabaseStatus(null);
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setActiveModalTab('manual')}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all",
                  activeModalTab === 'manual' ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Manual Input
              </button>
              <button 
                onClick={() => setActiveModalTab('bulk')}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all",
                  activeModalTab === 'bulk' ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Excel / CSV Import
              </button>
            </div>

            {activeModalTab === 'manual' ? (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  setSupabaseStatus(null);
                  
                  const formData = new FormData(e.currentTarget);
                  const data = Object.fromEntries(formData.entries());
                  
                  // Convert numeric strings to numbers
                  const numericFields = [
                    'rbd_po_yield', 'pfad_yield', 'total_production', 'target_production',
                    'electrical_consumption', 'steam_consumption', 'cng_consumption',
                    'demin_water', 'soft_water', 'solar_consumption', 'bleaching_earth',
                    'phosphoric_acid', 'efficiency', 'utilization', 'downtime_hours', 'working_hours'
                  ];
                  
                  const formattedData: any = { ...data };
                  numericFields.forEach(field => {
                    if (formattedData[field]) {
                      formattedData[field] = parseFloat(formattedData[field]);
                    }
                  });

                  try {
                    const response = await fetch('/api/performance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify([formattedData])
                    });
                    
                    const result = await response.json();
                    if (response.ok) {
                      setSupabaseStatus({ type: 'success', message: 'Data successfully saved!' });
                      refreshData();
                      setTimeout(() => {
                        setIsSupabaseModalOpen(false);
                        setSupabaseStatus(null);
                      }, 2000);
                    } else {
                      throw new Error(result.error || 'Failed to save data');
                    }
                  } catch (err: any) {
                    setSupabaseStatus({ type: 'error', message: err.message });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="p-6 overflow-y-auto max-h-[70vh] scrollbar-hide"
              >
                {supabaseStatus && (
                  <div className={cn(
                    "mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-3",
                    supabaseStatus.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                  )}>
                    {supabaseStatus.type === 'success' ? <Droplets size={18} /> : <AlertTriangle size={18} />}
                    {supabaseStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plant Unit</label>
                      <select name="plant_id" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
                      <input type="date" name="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Production (Ton)</label>
                      <input type="number" step="0.01" name="total_production" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">RBD PO Yield (%)</label>
                        <input type="number" step="0.01" name="rbd_po_yield" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PFAD Yield (%)</label>
                        <input type="number" step="0.01" name="pfad_yield" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Electrical (KWH)</label>
                      <input type="number" step="0.01" name="electrical_consumption" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Steam (KG)</label>
                      <input type="number" step="0.01" name="steam_consumption" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency (%)</label>
                        <input type="number" step="0.01" name="efficiency" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilization (%)</label>
                        <input type="number" step="0.01" name="utilization" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Working (Hr)</label>
                        <input type="number" step="0.01" name="working_hours" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Downtime (Hr)</label>
                        <input type="number" step="0.01" name="downtime_hours" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsSupabaseModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-3 bg-[#001f3f] hover:bg-[#002d5c] text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Droplets size={18} />
                    )}
                    {isSubmitting ? 'SAVING...' : 'SAVE TO SUPABASE'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Bulk Import System</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                    Use the <strong>Upload Data</strong> button in the main header to import Excel files.
                  </p>
                </div>
                
                <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Supabase Setup</h4>
                  <div className="bg-slate-900 text-slate-300 p-3 rounded-xl text-[9px] font-mono overflow-x-auto">
                    <p className="text-emerald-400 mb-1">-- Run in Supabase SQL Editor:</p>
                    <pre>
{`CREATE TABLE performance_data (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  plant_id TEXT NOT NULL,
  date DATE NOT NULL,
  rbd_po_yield REAL,
  pfad_yield REAL,
  total_production REAL,
  target_production REAL,
  electrical_consumption REAL,
  steam_consumption REAL,
  cng_consumption REAL,
  demin_water REAL,
  soft_water REAL,
  solar_consumption REAL,
  bleaching_earth REAL,
  phosphoric_acid REAL,
  efficiency REAL,
  utilization REAL,
  downtime_hours REAL,
  working_hours REAL,
  UNIQUE(plant_id, date)
);`}
                    </pre>
                  </div>
                </div>

                <button 
                  onClick={() => setIsSupabaseModalOpen(false)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  Got it
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ChatBot Component */}
      <ChatBot performanceData={performanceData} />
    </div>
  );
}
