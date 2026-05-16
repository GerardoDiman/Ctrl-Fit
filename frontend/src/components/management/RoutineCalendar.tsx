import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2, Circle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

interface RoutineCalendarProps {
  studentId: string;
  trainerId: string;
}

export function RoutineCalendar({ studentId, trainerId }: RoutineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [availableRoutines, setAvailableRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for the "Assign Routine" modal/overlay
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingRoutine, setViewingRoutine] = useState<any | null>(null);

  useEffect(() => {
    if (studentId && trainerId) {
      fetchData();
    }
  }, [studentId, trainerId, currentDate]);

  const fetchData = async () => {
    if (!studentId || !trainerId) return;
    setLoading(true);
    
    // 1. Fetch assignments for this month
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    const { data: assignData } = await supabase
      .from('routine_assignments')
      .select('*, routines(name)')
      .eq('student_id', studentId)
      .gte('scheduled_date', format(start, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(end, 'yyyy-MM-dd'));

    // 2. Fetch available routine templates
    const { data: routineData } = await supabase
      .from('routines')
      .select('*, routine_exercises(id)')
      .eq('trainer_id', trainerId)
      .is('student_id', null);

    if (assignData) setAssignments(assignData);
    if (routineData) {
      // For each routine, fetch its exercises for preview
      const routinesWithExercises = await Promise.all(routineData.map(async (r: any) => {
        const { data: exercises } = await supabase
          .from('routine_exercises')
          .select('*, exercises(name)')
          .eq('routine_id', r.id)
          .order('order_index');
        return { ...r, exercises: exercises || [] };
      }));
      setAvailableRoutines(routinesWithExercises);
    }
    setLoading(false);
  };

  const handleAssign = async (routineId: string) => {
    if (!selectedDate) return;
    
    const { error } = await supabase
      .from('routine_assignments')
      .insert({
        routine_id: routineId,
        student_id: studentId,
        trainer_id: trainerId,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd')
      });
    
    if (!error) {
      setShowAssignModal(false);
      fetchData();
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase
      .from('routine_assignments')
      .delete()
      .eq('id', id);
    
    if (!error) {
      fetchData();
    }
  };

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-white/5">
        <h3 className="text-lg font-bold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="bg-zinc-950 p-2 text-center text-[10px] font-bold text-gray-500 uppercase">
            {day}
          </div>
        ))}
        
        {calendarDays.map((day, i) => {
          const dayAssignments = assignments.filter(a => isSameDay(new Date(a.scheduled_date + 'T12:00:00'), day));
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div 
              key={i} 
              className={`min-h-[100px] bg-zinc-950 p-2 border-t border-white/5 transition-colors group relative ${
                !isCurrentMonth ? 'opacity-30' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs font-medium ${isToday ? 'bg-primary text-black h-5 w-5 flex items-center justify-center rounded-full' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </span>
                <button 
                  onClick={() => {
                    setSelectedDate(day);
                    setShowAssignModal(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                >
                  <Plus className="h-3 w-3 text-primary" />
                </button>
              </div>

              <div className="space-y-1">
                {dayAssignments.map(a => (
                  <div key={a.id} className={`text-[10px] p-1 rounded border flex items-center justify-between group/item ${
                    a.completed 
                      ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    <div className="flex items-center gap-1 truncate">
                      {a.completed && <CheckCircle2 className="h-2 w-2 shrink-0" />}
                      <span className="truncate pr-1">{a.routines.name}</span>
                    </div>
                    <button onClick={() => handleDeleteAssignment(a.id)} className="opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-300">
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Modal (Overlay) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-zinc-950 border-white/10 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Asignar Rutina</h3>
                  <p className="text-sm text-gray-400">Para el {format(selectedDate!, "d 'de' MMMM", { locale: es })}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAssignModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {availableRoutines.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 italic">
                    No tienes rutinas prefabricadas.
                    <br />
                    <a href="/dashboard/management" className="text-primary text-xs hover:underline mt-2 inline-block">Crear rutinas en Gestión</a>
                  </div>
                ) : viewingRoutine ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <Button variant="ghost" size="sm" onClick={() => setViewingRoutine(null)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-2">
                      <ChevronLeft className="h-4 w-4" /> Volver a la lista
                    </Button>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="font-bold text-primary mb-1">{viewingRoutine.name}</h4>
                      <p className="text-xs text-gray-400 mb-4">{viewingRoutine.description || 'Sin descripción'}</p>
                      
                      <div className="space-y-2">
                        {viewingRoutine.exercises.map((ex: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-2 rounded bg-black/40 text-xs border border-white/5">
                            <span className="font-medium">{ex.exercises.name}</span>
                            <span className="text-gray-500">{ex.sets}x{ex.reps} {ex.weight && `• ${ex.weight}kg`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full bg-primary text-black font-bold" onClick={() => handleAssign(viewingRoutine.id)}>
                      Asignar esta Rutina
                    </Button>
                  </div>
                ) : (
                  availableRoutines.map(r => (
                    <div
                      key={r.id}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="flex flex-col flex-1 cursor-pointer" onClick={() => setViewingRoutine(r)}>
                        <span className="font-bold text-sm group-hover:text-primary transition-colors">{r.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 uppercase font-bold">{r.exercises?.length || 0} EJERCICIOS</span>
                          {r.description && <span className="text-[10px] text-gray-600 truncate max-w-[150px]">• {r.description}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" onClick={() => setViewingRoutine(r)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" onClick={() => handleAssign(r.id)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <Button variant="outline" className="w-full" onClick={() => {
                  setShowAssignModal(false);
                  setViewingRoutine(null);
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
