import React, { useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import Papa from 'papaparse';

interface DataUploaderProps {
  onDataLoaded: (data: any[], fileName: string) => void;
  onClear: () => void;
  currentFile: string | null;
}

export default function DataUploader({ onDataLoaded, onClear, currentFile }: DataUploaderProps) {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            onDataLoaded(results.data, file.name);
          },
          error: (error) => {
            console.error('CSV Parsing Error:', error);
            alert('Error parsing CSV file');
          }
        });
      } else if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(content);
          onDataLoaded(Array.isArray(data) ? data : [data], file.name);
        } catch (error) {
          console.error('JSON Parsing Error:', error);
          alert('Error parsing JSON file');
        }
      } else {
        alert('Please upload a CSV or JSON file');
      }
    };
    reader.readAsText(file);
  }, [onDataLoaded]);

  return (
    <div className="space-y-4">
      {!currentFile ? (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-3 text-slate-400" />
            <p className="mb-2 text-sm text-slate-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-400">CSV or JSON (max. 10MB)</p>
          </div>
          <input type="file" className="hidden" accept=".csv,.json" onChange={handleFileUpload} />
        </label>
      ) : (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">{currentFile}</p>
              <p className="text-xs text-emerald-600">File loaded successfully</p>
            </div>
          </div>
          <button 
            onClick={onClear}
            className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
