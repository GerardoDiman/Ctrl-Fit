import React from 'react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

interface InteractiveCalendarProps {
  currentDate: Date; // Mes visible actual
  onDateChange: (date: Date) => void; // Callback al navegar de mes
  selectedDate?: Date | null; // Fecha seleccionada actualmente
  renderDayCell: (
    day: Date,
    metadata: {
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dayFormatted: string;
    }
  ) => React.ReactNode;
  className?: string; // Estilos adicionales para el contenedor principal
  gridClassName?: string; // Estilos adicionales para la rejilla
}

export function InteractiveCalendar({
  currentDate,
  onDateChange,
  selectedDate,
  renderDayCell,
  className = '',
  gridClassName = ''
}: InteractiveCalendarProps) {
  // Configuración de intervalos de fechas
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const nextMonth = () => onDateChange(addMonths(currentDate, 1));
  const prevMonth = () => onDateChange(subMonths(currentDate, 1));

  return (
    <Card className={`bg-zinc-950 border-white/5 overflow-hidden shadow-2xl transition-all duration-300 ${className}`}>
      {/* Calendar Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-4 bg-zinc-900/40 border-b border-white/5 px-6">
        <CardTitle className="text-xl capitalize flex items-center gap-2.5 font-heading text-white">
          <CalendarIcon className="h-5 w-5 text-primary animate-pulse" />
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </CardTitle>
        <div className="flex gap-1.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-white/5 text-gray-400 hover:text-white rounded-full transition-colors duration-200" 
            onClick={prevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-white/5 text-gray-400 hover:text-white rounded-full transition-colors duration-200" 
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {/* Calendar Grid */}
      <CardContent className="p-0">
        <div className={`grid grid-cols-7 border-t border-white/5 ${gridClassName}`}>
          {/* Fila de días de la semana */}
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
            <div 
              key={idx} 
              className="p-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 bg-zinc-950/20"
            >
              {day}
            </div>
          ))}
          
          {/* Rejilla de días */}
          {calendarDays.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayFormatted = format(day, 'd');

            return (
              <React.Fragment key={i}>
                {renderDayCell(day, {
                  isCurrentMonth,
                  isToday,
                  isSelected,
                  dayFormatted
                })}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
