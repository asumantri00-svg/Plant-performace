import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Plant {
  id: string;
  name: string;
}

interface DataUploaderProps {
  plants: Plant[];
  onUploadSuccess: () => void;
}

export default function DataUploader({ plants, onUploadSuccess }: DataUploaderProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');

    if (isExcel || isCSV) {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setFileName(file.name);
        setShowMappingModal(true);
        
        // Auto-mapping based on common names
        const initialMappings: Record<string, string> = {};
        const sheetNames = wb.SheetNames;
        
        plants.forEach(plant => {
          const match = sheetNames.find(s => {
            const lowerS = s.toLowerCase();
            const lowerP = plant.name.toLowerCase();
            
            // Specific user requested mappings
            if (lowerP.includes('refinery 1') && (lowerS.includes('ref 1') || lowerS === 'refinery 1')) return true;
            if (lowerP.includes('refinery 2') && (lowerS.includes('ref 2') || lowerS === 'refinery 2')) return true;
            if (lowerP.includes('refinery 3') && (lowerS.includes('ref 3') || lowerS === 'refinery 3')) return true;
            if (lowerP.includes('ptr') && lowerS.includes('ptr')) return true;
            if (lowerP.includes('biodiesel') && (lowerS.includes('bio') || lowerS === 'biodiesel')) return true;
            if (lowerP.includes('glycerine 1') && (lowerS === 'gly' || lowerS === 'glycerine 1')) return true;
            if (lowerP.includes('glycerine 2') && (lowerS === 'gly 2' || lowerS === 'glycerine 2')) return true;
            if (lowerP.includes('clarification') && (lowerS === 'clr' || lowerS === 'clarification')) return true;
            
            return lowerS.includes(lowerP);
          });
          if (match) initialMappings[plant.id] = match;
        });
        setMappings(initialMappings);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
    }
  }, [plants]);

  const handleProcessUpload = async () => {
    if (!workbook) return;
    setIsUploading(true);

    try {
      const allData: any[] = [];
      
      for (const [plantId, sheetName] of Object.entries(mappings)) {
        if (!sheetName) continue;
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Map Excel columns to database columns
        const processedData = jsonData.map((row: any) => ({
          plant_id: plantId,
          date: row.Date || row.date || new Date().toISOString().split('T')[0],
          rbd_po_yield: parseFloat(row['RBD PO Yield'] || row.rbd_po_yield || 0),
          pfad_yield: parseFloat(row['PFAD Yield'] || row.pfad_yield || 0),
          total_production: parseFloat(row['Total Production'] || row.total_production || 0),
          target_production: parseFloat(row['Target Production'] || row.target_production || 0),
          electrical_consumption: parseFloat(row['Electrical'] || row.electrical_consumption || 0),
          steam_consumption: parseFloat(row['Steam'] || row.steam_consumption || 0),
          cng_consumption: parseFloat(row['CNG'] || row.cng_consumption || 0),
          demin_water: parseFloat(row['Demin Water'] || row.demin_water || 0),
          soft_water: parseFloat(row['Soft Water'] || row.soft_water || 0),
          solar_consumption: parseFloat(row['Solar'] || row.solar_consumption || 0),
          bleaching_earth: parseFloat(row['Bleaching Earth'] || row.bleaching_earth || 0),
          phosphoric_acid: parseFloat(row['Phosphoric Acid'] || row.phosphoric_acid || 0),
          efficiency: parseFloat(row['Efficiency'] || row.efficiency || 0),
          utilization: parseFloat(row['Utilization'] || row.utilization || 0),
          downtime_hours: parseFloat(row['Downtime'] || row.downtime_hours || 0),
          working_hours: parseFloat(row['Working Hours'] || row.working_hours || 0),
        }));
        
        allData.push(...processedData);
      }

      if (allData.length === 0) {
        alert('No data mapped to upload');
        setIsUploading(false);
        return;
      }

      const response = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allData),
      });

      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (response.ok) {
        if (result.supabase) {
          alert(`Successfully uploaded ${allData.length} records to Supabase and local storage.`);
        } else {
          alert(`Uploaded ${allData.length} records to local storage. Supabase sync failed or not configured.`);
        }
        onUploadSuccess();
        setShowMappingModal(false);
        setWorkbook(null);
        setFileName(null);
      } else {
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl cursor-pointer hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
        <Upload size={18} />
        <span className="text-sm font-bold uppercase tracking-tight">Upload Data</span>
        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
      </label>

      <AnimatePresence>
        {showMappingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-600" />
                    Map Excel Sheets
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">File: {fileName}</p>
                </div>
                <button 
                  onClick={() => setShowMappingModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-800">
                  <AlertCircle className="shrink-0" size={20} />
                  <p className="text-xs font-medium leading-relaxed">
                    Select the corresponding worksheet for each factory unit. Sheets not mapped will be ignored.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {plants.map(plant => (
                    <div key={plant.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">{plant.name}</p>
                        <select 
                          value={mappings[plant.id] || ''}
                          onChange={(e) => setMappings(prev => ({ ...prev, [plant.id]: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        >
                          <option value="">-- Select Sheet --</option>
                          {workbook?.SheetNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      {mappings[plant.id] && (
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setShowMappingModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleProcessUpload}
                  disabled={isUploading || Object.values(mappings).filter(Boolean).length === 0}
                  className="px-8 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Confirm & Upload
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
