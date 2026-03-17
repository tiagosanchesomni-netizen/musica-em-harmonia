import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Selecionar...' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const selectedLabels = selected.map(v => options.find(o => o.value === v)?.label).filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedLabels.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
          {selectedLabels.map((label, i) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1">
              {label}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={e => { e.stopPropagation(); toggle(selected[i]); }}
              />
            </Badge>
          ))}
        </div>
        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                selected.includes(opt.value) ? 'bg-accent/50 font-medium' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sem opções disponíveis.</p>
          )}
        </div>
      )}
    </div>
  );
}
