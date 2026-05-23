import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { InteractiveCalendar } from './InteractiveCalendar';

interface DatePickerProps {
  value: string; // formato YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({ value, onChange, disabled = false, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Convertir string de fecha "YYYY-MM-DD" a objeto Date de forma segura en hora local
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const selectedDateObj = value ? parseLocalDate(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(selectedDateObj);

  // Sincronizar el mes visible del calendario cuando cambie el valor externo
  useEffect(() => {
    if (value) {
      setCurrentMonth(parseLocalDate(value));
    }
  }, [value]);

  // Cerrar el popover al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  // Formatear la fecha seleccionada de forma premium en español (ej. "22 de mayo, 2026")
  const formattedValue = selectedDateObj
    ? format(selectedDateObj, "d 'de' MMMM, yyyy", { locale: es })
    : 'Seleccionar fecha';

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Botón Trigger del Date Picker */}
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 transition-colors p-2 px-4 rounded-xl border border-white/10 shadow-inner group w-full ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'border-primary/50 ring-1 ring-primary/20 bg-white/10' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon className={`h-4 w-4 transition-transform duration-300 ${
            disabled ? 'text-gray-500' : 'text-primary group-hover:scale-110'
          }`} />
          <span className="text-white text-sm font-semibold select-none">
            {formattedValue}
          </span>
        </div>
        {!disabled && (
          <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`} />
        )}
      </button>

      {/* Popover del Calendario */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <InteractiveCalendar
            currentDate={currentMonth}
            onDateChange={setCurrentMonth}
            selectedDate={selectedDateObj}
            className="w-[290px] border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-xl"
            gridClassName="p-2 gap-1"
            renderDayCell={(day, { isCurrentMonth, isToday, isSelected, dayFormatted }) => {
              return (
                <button
                  type="button"
                  onClick={() => {
                    const formattedDate = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;
                    onChange(formattedDate);
                    setIsOpen(false);
                  }}
                  className={`h-9 w-9 text-xs flex items-center justify-center rounded-lg transition-all font-medium ${
                    !isCurrentMonth 
                      ? 'text-gray-600 opacity-20 hover:bg-white/5' 
                      : 'text-gray-200'
                  } ${
                    isSelected 
                      ? 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.4)] hover:bg-primary' 
                      : 'hover:bg-white/5'
                  } ${isToday && !isSelected ? 'border border-primary text-primary font-bold' : ''}`}
                >
                  {dayFormatted}
                </button>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
