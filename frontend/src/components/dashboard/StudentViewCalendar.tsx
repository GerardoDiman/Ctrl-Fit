import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Info, Dumbbell } from 'lucide-react';
import { format, isSameDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { InteractiveCalendar } from '@/components/ui/InteractiveCalendar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function StudentViewCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayAssignments, setSelectedDayAssignments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAssignments();
  }, [currentDate]);

  const fetchAssignments = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

    const { data } = await supabase
      .from('routine_assignments')
      .select('*, routines(*)')
      .eq('student_id', session.user.id)
      .gte('scheduled_date', format(start, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(end, 'yyyy-MM-dd'));

    if (data) {
      setAssignments(data);
      // Update selected day assignments if it's in the current view
      const dayData = data.filter(a => isSameDay(new Date(a.scheduled_date + 'T12:00:00'), selectedDate));
      setSelectedDayAssignments(dayData);
    }
    setLoading(false);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    const dayData = assignments.filter(a => isSameDay(new Date(a.scheduled_date + 'T12:00:00'), day));
    setSelectedDayAssignments(dayData);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
      {/* Calendar Grid */}
      <div className="lg:col-span-7">
        <InteractiveCalendar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          selectedDate={selectedDate}
          renderDayCell={(day, { isCurrentMonth, isToday, isSelected, dayFormatted }) => {
            const dayAssignments = assignments.filter(a => isSameDay(new Date(a.scheduled_date + 'T12:00:00'), day));
            return (
              <button
                onClick={() => handleDayClick(day)}
                className={`h-14 border-b border-r border-white/5 p-1 transition-all relative flex flex-col items-center justify-start ${
                  !isCurrentMonth ? 'opacity-20' : ''
                } ${isSelected ? 'bg-primary/5 border-b-2 border-b-primary' : 'hover:bg-white/5'}`}
              >
                <span className={`text-xs h-6 w-6 flex items-center justify-center rounded-full mb-1 ${
                  isToday ? 'bg-primary text-black font-bold' : isSelected ? 'text-primary font-bold' : 'text-gray-400'
                }`}>
                  {dayFormatted}
                </span>
                {dayAssignments.length > 0 && (
                  <div className="flex gap-0.5 mt-auto mb-1">
                    {dayAssignments.map((_, idx) => (
                      <div key={idx} className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                    ))}
                  </div>
                )}
              </button>
            );
          }}
        />
      </div>

      {/* Day Details */}
      <div className="lg:col-span-5">
        <Card className="bg-zinc-950 border-white/5 h-full">
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </CardTitle>
            <p className="text-sm text-gray-400">Rutinas asignadas para este día</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDayAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                  <Info className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-gray-500 italic text-sm">No tienes entrenamientos programados para hoy.</p>
                <p className="text-gray-600 text-xs mt-2">¡Aprovecha para descansar o realizar una rutina libre!</p>
              </div>
            ) : (
              selectedDayAssignments.map(a => (
                <div key={a.id} className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white">{a.routines.name}</h4>
                      <p className="text-xs text-gray-400 mt-1">{a.routines.description || 'Sin descripción'}</p>
                    </div>
                    {a.completed && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                        Completado
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="w-full bg-primary text-black font-bold h-9 text-xs"
                      onClick={() => window.location.href = `/dashboard/workout?routineId=${a.routines.id}&assignmentId=${a.id}`}
                    >
                      <Dumbbell className="h-3.5 w-3.5 mr-2" /> PREPARAR
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
