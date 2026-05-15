import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, Check, Save, Play, Square, Loader2, Calendar as CalendarIcon } from 'lucide-react';

interface Set {
  weight: string;
  reps: string;
  completed: boolean;
}

interface WorkoutExercise {
  id: string;
  name: string;
  sets: Set[];
}

interface ExerciseOption {
  id: string;
  name: string;
}

type SessionStatus = 'planning' | 'active' | 'saving';

export const WorkoutSession = () => {
  const [status, setStatus] = useState<SessionStatus>('planning');
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [sessionExercises, setSessionExercises] = useState<WorkoutExercise[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [routineName, setRoutineName] = useState('Mi Rutina Personalizada');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [creationDate, setCreationDate] = useState<string>(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }));
  const [isNewRoutine, setIsNewRoutine] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (status === 'active' && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, startTime]);

  // Fetch routine if ID is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routineId = params.get('routineId');
    const edit = params.get('edit') === 'true';

    if (routineId) {
      setCurrentRoutineId(routineId);
      setIsEditMode(edit);
      
      const loadRoutine = async () => {
        const { data: routine, error } = await supabase
          .from('routines')
          .select(`
            name,
            created_at,
            routine_exercises (
              exercise_id,
              sets,
              reps,
              weight,
              sets_data,
              exercises (name)
            )
          `)
          .eq('id', routineId)
          .single();

        if (!error && routine) {
          setRoutineName(routine.name);
          setCreationDate(new Date(routine.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }));
          setIsNewRoutine(!edit); // Si estamos editando, no es una "nueva" rutina visualmente en el mismo sentido
          
          const mappedExercises = routine.routine_exercises.map((re: any) => {
            const sets = re.sets_data && Array.isArray(re.sets_data) && re.sets_data.length > 0
              ? re.sets_data.map((s: any) => ({
                  weight: s.weight?.toString() || '',
                  reps: s.reps?.toString() || '',
                  completed: false
                }))
              : Array.from({ length: re.sets || 1 }).map(() => ({
                  weight: re.weight?.toString() || '',
                  reps: re.reps?.toString() || '',
                  completed: false
                }));

            return {
              id: re.exercise_id,
              name: re.exercises.name,
              sets
            };
          });
          setSessionExercises(mappedExercises);
        }
      };
      loadRoutine();
    }
  }, []);

  // Fetch exercises for the selector
  useEffect(() => {
    const fetchExercises = async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .order('name');
      if (!error && data) setExercises(data);
    };
    fetchExercises();
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startWorkout = () => {
    if (sessionExercises.length === 0) {
      alert('Programa al menos un ejercicio antes de empezar.');
      return;
    }
    // Si la fecha seleccionada no es hoy, ajustamos el startTime relativo a esa fecha
    const [year, month, day] = selectedDate.split('-').map(Number);
    const now = new Date();
    const workoutStart = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    
    setStartTime(workoutStart);
    setStatus('active');
  };

  const saveRoutine = async () => {
    if (sessionExercises.length === 0) {
      alert('Agrega ejercicios para guardar la rutina.');
      return;
    }
    
    setStatus('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let routineIdToUse = currentRoutineId;

      if (isEditMode && routineIdToUse) {
        // Actualizar rutina existente
        const { error: routineError } = await supabase
          .from('routines')
          .update({
            name: routineName,
            description: 'Rutina actualizada desde el panel'
          })
          .eq('id', routineIdToUse);

        if (routineError) throw routineError;

        // Limpiar ejercicios anteriores para re-insertar (sincronización simple)
        await supabase.from('routine_exercises').delete().eq('routine_id', routineIdToUse);
      } else {
        // Crear nueva rutina
        const { data: routine, error: routineError } = await supabase
          .from('routines')
          .insert({
            trainer_id: session.user.id,
            student_id: session.user.id,
            name: routineName,
            description: 'Rutina programada desde el panel'
          })
          .select()
          .single();

        if (routineError) throw routineError;
        routineIdToUse = routine.id;
      }

      // Insertar los ejercicios (nuevos o actualizados)
      const routineEx = sessionExercises.map((ex, idx) => {
        const repsValue = parseInt(ex.sets[0]?.reps);
        const weightValue = parseFloat(ex.sets[0]?.weight);
        return {
          routine_id: routineIdToUse,
          exercise_id: ex.id,
          order_index: idx,
          sets: ex.sets.length,
          reps: isNaN(repsValue) ? 0 : repsValue,
          weight: isNaN(weightValue) ? 0 : weightValue,
          sets_data: ex.sets.map(s => ({
            reps: parseInt(s.reps) || 0,
            weight: parseFloat(s.weight) || 0
          }))
        };
      });

      console.log('Insertando ejercicios:', routineEx);
      const { error: exercisesError } = await supabase.from('routine_exercises').insert(routineEx);
      
      if (exercisesError) {
        console.error('Error al insertar ejercicios:', exercisesError);
        throw exercisesError;
      }

      alert(isEditMode ? 'Rutina actualizada correctamente.' : 'Rutina guardada correctamente.');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error completo en saveRoutine:', error);
      alert('Error al guardar: ' + (error as any).message);
      setStatus('planning');
    }
  };

  const finishWorkout = async () => {
    setStatus('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const durationMs = elapsedTime * 1000;
      const endWorkoutTime = new Date(startTime!.getTime() + durationMs);

      const { data: workoutSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          name: routineName,
          start_time: startTime?.toISOString(),
          end_time: endWorkoutTime.toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const logs = sessionExercises.flatMap((ex) => 
        ex.sets.map((set, idx) => ({
          session_id: workoutSession.id,
          exercise_id: ex.id,
          set_number: idx + 1,
          weight: parseFloat(set.weight) || 0,
          reps: parseInt(set.reps) || 0,
          completed: true
        }))
      );

      await supabase.from('workout_logs').insert(logs);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error:', error);
      setStatus('active');
    }
  };

  const addExercise = (exercise: ExerciseOption) => {
    setSessionExercises([...sessionExercises, {
      id: exercise.id,
      name: exercise.name,
      sets: [{ weight: '', reps: '', completed: false }]
    }]);
    setShowExerciseSelector(false);
  };

  const updateSet = (exIdx: number, sIdx: number, field: keyof Set, value: any) => {
    const updated = [...sessionExercises];
    updated[exIdx].sets[sIdx] = { ...updated[exIdx].sets[sIdx], [field]: value };
    setSessionExercises(updated);
  };

  const removeSet = (exIdx: number, sIdx: number) => {
    const updated = [...sessionExercises];
    if (updated[exIdx].sets.length > 1) {
      const exercise = { ...updated[exIdx] };
      exercise.sets = exercise.sets.filter((_, i) => i !== sIdx);
      updated[exIdx] = exercise;
      setSessionExercises(updated);
    } else {
      alert('Un ejercicio debe tener al menos una serie. Si deseas quitar el ejercicio completo, usa el botón de eliminar de arriba.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Dynamic Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-2xl sticky top-4 z-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={`p-4 rounded-full transition-all duration-500 ${status === 'active' ? 'bg-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.4)]' : 'bg-white/5'}`}>
              <Clock className={`${status === 'active' ? 'text-black animate-spin-slow' : 'text-gray-500'} h-8 w-8`} />
            </div>
            <div className="flex-1">
              <Input 
                value={routineName} 
                onChange={(e) => setRoutineName(e.target.value)}
                className="bg-transparent border-none text-2xl font-bold p-0 focus-visible:ring-0 text-white h-auto mb-1"
                placeholder="Nombre del Entrenamiento"
                disabled={status === 'active'}
              />
              <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <span className="text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                  {status === 'planning' ? 'Planificación' : 'En Vivo'}
                </span>
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3" />
                  <span>
                    {isEditMode ? `Editando: ${routineName}` : (isNewRoutine ? 'Nueva Rutina - Hoy' : `Programado: ${creationDate}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Calendar Picker - Execution Date */}
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Fecha de Entrenamiento</span>
            <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-2 px-4 rounded-xl border border-white/10 shadow-inner group">
              <CalendarIcon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-white focus:ring-0 text-sm font-bold cursor-pointer"
                disabled={status === 'active'}
              />
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {status === 'planning' ? (
              <>
                <Button variant="outline" className="flex-1" onClick={saveRoutine}>
                  <Save className="mr-2 h-4 w-4" /> {isEditMode ? 'Actualizar' : 'Programar'}
                </Button>
                <Button className="flex-1 bg-primary text-black font-bold" onClick={startWorkout}>
                  <Play className="mr-2 h-4 w-4 fill-current" /> Iniciar
                </Button>
              </>
            ) : (
              <Button className="w-full bg-red-600 text-white font-bold" onClick={finishWorkout} disabled={status === 'saving'}>
                {status === 'saving' ? <Loader2 className="animate-spin mr-2" /> : <Square className="mr-2 h-4 w-4 fill-current" />}
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold font-heading">Ejercicios</h3>
            <div className="text-4xl font-black font-heading tabular-nums text-primary/80">
              {formatTime(elapsedTime)}
            </div>
        </div>

        {sessionExercises.map((ex, exIdx) => (
          <Card key={exIdx} className="overflow-hidden border-white/5 bg-black/20">
            <CardHeader className="flex flex-row items-center justify-between bg-white/5 py-4 px-6">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {exIdx + 1}
                </div>
                <CardTitle>{ex.name}</CardTitle>
              </div>
              {status === 'planning' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que deseas eliminar este ejercicio de la rutina?')) {
                      setSessionExercises(sessionExercises.filter((_, i) => i !== exIdx));
                    }
                  }}
                >
                  <Trash2 className="h-5 w-5 text-gray-500 hover:text-red-500" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-12 gap-4 mb-3 text-[10px] font-bold text-gray-500 uppercase">
                    <div className="col-span-2 text-center">Set</div>
                    <div className="col-span-4 text-center">Peso (KG)</div>
                    <div className="col-span-4 text-center">Reps</div>
                    <div className="col-span-2 text-center">Log</div>
                </div>
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className="grid grid-cols-12 gap-4 items-center mb-2">
                  <div className="col-span-2 text-center font-bold text-gray-500">{setIdx + 1}</div>
                  <div className="col-span-4">
                    <Input type="number" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} className="text-center bg-black/40 h-10" placeholder="0" />
                  </div>
                  <div className="col-span-4">
                    <Input type="number" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} className="text-center bg-black/40 h-10" placeholder="0" />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {status === 'planning' ? (
                      <button 
                        className="h-10 w-10 rounded-full border-2 border-white/10 flex items-center justify-center transition-all hover:bg-red-500/20 hover:border-red-500/50 text-gray-500 hover:text-red-500"
                        onClick={() => removeSet(exIdx, setIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button 
                        className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${set.completed ? 'bg-primary border-primary text-black' : 'border-white/10'}`}
                        onClick={() => updateSet(exIdx, setIdx, 'completed', !set.completed)}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full mt-4 border border-dashed border-white/10" onClick={() => {
                const updated = [...sessionExercises];
                updated[exIdx].sets.push({ weight: '', reps: '', completed: false });
                setSessionExercises(updated);
              }}>
                + Serie
              </Button>
            </CardContent>
          </Card>
        ))}

        {!showExerciseSelector && (
          <Button className="w-full h-16 bg-primary/5 border-2 border-dashed border-primary/20 text-primary" onClick={() => setShowExerciseSelector(true)}>
            + Añadir Ejercicio
          </Button>
        )}
      </div>

      {/* Selector Modal */}
      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-primary bg-zinc-950">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Añadir Ejercicio</CardTitle>
                <Button variant="ghost" onClick={() => setShowExerciseSelector(false)}>X</Button>
              </div>
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-4" />
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {exercises.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                <Button key={e.id} variant="ghost" className="w-full justify-start h-12" onClick={() => addExercise(e)}>
                  {e.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
