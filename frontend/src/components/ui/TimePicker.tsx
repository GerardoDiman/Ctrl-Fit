import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // formato "HH:MM" (24 horas, ej. "14:30")
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ value, onChange, disabled = false, className = '' }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  // Parsear el valor actual o por defecto
  const [hourStr, minuteStr] = (value || '00:00').split(':');
  const selectedHour = parseInt(hourStr) || 0;
  const selectedMinute = parseInt(minuteStr) || 0;

  // Generar rangos
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Usamos intervalos de 5 minutos para una selección más rápida y limpia,
  // pero permitimos todos los minutos si se prefiere. El estándar premium de fitness usa de 5 en 5.
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  // Sincronizar scroll al abrir el menú
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        // Encontrar el botón seleccionado en horas y hacer scroll
        const selectedHourEl = hourListRef.current?.querySelector('[data-selected="true"]');
        if (selectedHourEl) {
          selectedHourEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
        // Encontrar el botón seleccionado en minutos y hacer scroll
        const selectedMinuteEl = minuteListRef.current?.querySelector('[data-selected="true"]');
        if (selectedMinuteEl) {
          selectedMinuteEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }, 50); // Pequeño delay para asegurar que el DOM del popover esté montado
    }
  }, [isOpen]);

  // Cerrar popover al hacer clic fuera
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

  const handleSelectHour = (hour: number) => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = selectedMinute.toString().padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
  };

  const handleSelectMinute = (minute: number) => {
    const formattedHour = selectedHour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
  };

  // Formatear el valor visible en formato 12h para mayor elegancia (ej: "02:30 PM")
  const formatTime12h = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const formattedHour = hour12.toString().padStart(2, '0');
    const formattedMinute = m.toString().padStart(2, '0');
    return `${formattedHour}:${formattedMinute} ${period}`;
  };

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Botón Trigger */}
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`flex items-center justify-between gap-2.5 bg-black/40 hover:bg-white/5 transition-colors p-2 px-3 h-10 rounded-lg border border-white/10 shadow-inner group w-full ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'border-primary/50 ring-1 ring-primary/20 bg-white/5' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 transition-transform duration-300 ${
            disabled ? 'text-gray-500' : 'text-primary group-hover:scale-110'
          }`} />
          <span className="text-white text-sm font-medium font-sans select-none">
            {formatTime12h(selectedHour, selectedMinute)}
          </span>
        </div>
        {!disabled && (
          <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`} />
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop para móviles */}
          <div 
            className="fixed inset-0 bg-black/80 z-40 md:hidden animate-in fade-in duration-200" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="fixed md:absolute inset-x-4 top-[30%] mx-auto md:mx-0 md:inset-x-auto md:left-0 md:mt-1 z-50 flex justify-center md:block animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-top-1 duration-150">
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex gap-2.5 w-full max-w-[240px] h-60 md:w-48 md:h-48 backdrop-blur-md">
              {/* Columna Horas */}
              <div 
                ref={hourListRef}
                className="flex-1 overflow-y-auto no-scrollbar h-full flex flex-col gap-0.5 pr-0.5 border-r border-white/5"
                style={{ scrollbarWidth: 'none' }}
              >
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center mb-1.5 select-none">Hora</div>
                {hours.map(h => {
                  const isHourSelected = h === selectedHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-selected={isHourSelected}
                      onClick={() => handleSelectHour(h)}
                      className={`text-xs py-2 md:py-1.5 rounded text-center transition-all font-medium select-none ${
                        isHourSelected 
                          ? 'bg-primary text-black font-bold' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {h.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>

              {/* Columna Minutos */}
              <div 
                ref={minuteListRef}
                className="flex-1 overflow-y-auto no-scrollbar h-full flex flex-col gap-0.5 pl-0.5"
                style={{ scrollbarWidth: 'none' }}
              >
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center mb-1.5 select-none">Min</div>
                {minutes.map(m => {
                  const isMinuteSelected = m === selectedMinute;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-selected={isMinuteSelected}
                      onClick={() => handleSelectMinute(m)}
                      className={`text-xs py-2 md:py-1.5 rounded text-center transition-all font-medium select-none ${
                        isMinuteSelected 
                          ? 'bg-primary text-black font-bold' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {m.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
