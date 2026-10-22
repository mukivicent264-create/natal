import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table, FileSpreadsheet, Code, Printer, ChevronDown, Check, Sparkles } from 'lucide-react';
import { exportToCSV, exportToTSV, exportToJSON, exportToPDF, ExportColumn, showAppNotification } from '../utils/exportUtils';

export interface ExportButtonProps<T = any> {
  data: T[];
  columns: ExportColumn<T>[];
  filenamePrefix?: string;
  title: string;
  subtitle?: string;
  category?: string;
  summaryCards?: { label: string; value: string | number }[];
  notes?: string;
  className?: string;
  buttonLabel?: string;
  variant?: 'gold' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  showDropdown?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  columns,
  filenamePrefix = 'natal_export',
  title,
  subtitle,
  category,
  summaryCards,
  notes,
  className = '',
  buttonLabel = 'Export Data',
  variant = 'outline',
  size = 'md',
  showDropdown = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentExport, setRecentExport] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: 'pdf' | 'csv' | 'tsv' | 'json') => {
    setIsOpen(false);
    if (!data || data.length === 0) {
      showAppNotification(`No records in ${title} to export.`, 'info');
      return;
    }

    if (format === 'pdf') {
      exportToPDF({
        title,
        subtitle,
        category,
        data,
        columns,
        summaryCards,
        notes
      });
      setRecentExport('PDF');
    } else if (format === 'csv') {
      exportToCSV(data, columns, filenamePrefix);
      setRecentExport('CSV');
    } else if (format === 'tsv') {
      exportToTSV(data, columns, filenamePrefix);
      setRecentExport('Excel');
    } else if (format === 'json') {
      exportToJSON(data, filenamePrefix);
      setRecentExport('JSON');
    }

    setTimeout(() => {
      setRecentExport(null);
    }, 3500);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'gold':
        return 'bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 text-black-pure font-bold shadow-[0_2px_15px_rgba(212,175,55,0.35)]';
      case 'subtle':
        return 'bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/40 text-gray-300 hover:text-gold';
      case 'outline':
      default:
        return 'bg-black-pure border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold shadow-sm';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1.5 text-[11px] gap-1.5';
      case 'lg':
        return 'px-5 py-3 text-sm gap-2.5';
      case 'md':
      default:
        return 'px-3.5 py-2.5 text-xs gap-2';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div className="flex items-center rounded-sm">
        <button
          type="button"
          onClick={() => {
            if (showDropdown) {
              setIsOpen(!isOpen);
            } else {
              handleExport('pdf');
            }
          }}
          className={`font-mono uppercase tracking-wider flex items-center transition-all cursor-pointer rounded-sm active:scale-[0.98] ${getVariantStyles()} ${getSizeStyles()} ${className}`}
          title="Export data to PDF or editable formats (Excel, CSV, JSON)"
        >
          <Download size={size === 'sm' ? 13 : 15} className="shrink-0" />
          <span>{recentExport ? `Exported ${recentExport}!` : buttonLabel}</span>
          {showDropdown && (
            <ChevronDown size={size === 'sm' ? 12 : 14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
      </div>

      {/* Export Options Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 origin-top-right bg-black-pure border border-gold/40 divide-y divide-white/10 rounded-sm shadow-2xl z-50 animate-fadeIn backdrop-blur-md">
          <div className="px-3.5 py-2.5 bg-gold/10 border-b border-gold/20">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
              <Sparkles size={11} /> Export Engine
            </p>
            <p className="text-xs text-gray-300 mt-0.5 truncate font-medium">
              {title} ({data.length} records)
            </p>
          </div>

          <div className="py-1">
            {/* 1. PDF Document Format */}
            <button
              onClick={() => handleExport('pdf')}
              className="group flex w-full items-center justify-between px-3.5 py-2.5 text-xs text-left text-gray-200 hover:bg-gold/15 hover:text-gold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-sm group-hover:border-gold group-hover:text-gold transition-colors">
                  <FileText size={15} />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Executive PDF Document</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-gold/20 text-gold rounded">PDF</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                    Printable, stylized report ready for sharing &amp; archiving
                  </div>
                </div>
              </div>
            </button>

            {/* 2. Editable Excel / TSV Format */}
            <button
              onClick={() => handleExport('tsv')}
              className="group flex w-full items-center justify-between px-3.5 py-2.5 text-xs text-left text-gray-200 hover:bg-gold/15 hover:text-gold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-sm group-hover:border-gold group-hover:text-gold transition-colors">
                  <FileSpreadsheet size={15} />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Excel Spreadsheet (Editable)</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">XLS</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                    Open directly in Microsoft Excel, Apple Numbers, Google Sheets
                  </div>
                </div>
              </div>
            </button>

            {/* 3. Editable CSV Spreadsheet Format */}
            <button
              onClick={() => handleExport('csv')}
              className="group flex w-full items-center justify-between px-3.5 py-2.5 text-xs text-left text-gray-200 hover:bg-gold/15 hover:text-gold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-sm group-hover:border-gold group-hover:text-gold transition-colors">
                  <Table size={15} />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>CSV Spreadsheet (Editable)</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-blue-500/20 text-blue-300 rounded">CSV</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                    Standard comma-separated table for data editing &amp; CRM import
                  </div>
                </div>
              </div>
            </button>

            {/* 4. Structured JSON Raw Data */}
            <button
              onClick={() => handleExport('json')}
              className="group flex w-full items-center justify-between px-3.5 py-2.5 text-xs text-left text-gray-200 hover:bg-gold/15 hover:text-gold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-sm group-hover:border-gold group-hover:text-gold transition-colors">
                  <Code size={15} />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Structured JSON (Editable)</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded">JSON</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                    Raw developer payload with complete object schemas
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="px-3 py-2 bg-black-pure/90 text-[10px] text-gray-500 font-mono text-center">
            Formats compatible with MS Excel, Sheets, &amp; PDF readers
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
