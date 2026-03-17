
import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

registerLocale('pt-BR', ptBR);

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  minDate?: Date;
}

const CustomDatePicker = ({ selected, onChange, placeholderText, className, minDate }: CustomDatePickerProps) => {
  return (
    <div className="relative w-full group">
      <DatePicker
        selected={selected}
        onChange={onChange}
        locale="pt-BR"
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholderText}
        minDate={minDate}
        className={`w-full bg-[var(--bg-card-alt)] text-[var(--text-main)] px-5 py-3.5 pl-12 rounded-2xl border border-[var(--border)] outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all font-medium placeholder:text-[var(--text-muted)] text-sm ${className}`}
      />
      <Calendar 
        size={18} 
        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-yellow-500 transition-colors pointer-events-none" 
      />
    </div>
  );
};

export default CustomDatePicker;
