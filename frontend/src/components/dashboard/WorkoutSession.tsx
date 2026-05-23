import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, Check, Save, Play, Square, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';

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
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  });
  const [creationDate, setCreationDate] = useState<string>(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }));
  const [isNewRoutine, setIsNewRoutine] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  
  // Recovery of workout session
  const [pendingWorkout, setPendingWorkout] = useState<any | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState<boolean>(false);
  
  // Auth and Roles
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer' || profile?.role === 'owner';

  // New Exercise Creation
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<{id: string, name: string}[]>([]);

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

  // Auto-save active workout session to localStorage
  useEffect(() => {
    if (status === 'active' && startTime) {
      const workoutState = {
        startTime: startTime.toISOString(),
        routineName,
        selectedDate,
        isNewRoutine,
        isEditMode,
        currentRoutineId,
        assignmentId,
        sessionExercises
      };
      localStorage.setItem('ctrlfit_active_workout', JSON.stringify(workoutState));
    }
  }, [status, startTime, routineName, selectedDate, isNewRoutine, isEditMode, currentRoutineId, assignmentId, sessionExercises]);

  // Detect active workout session on mount
  useEffect(() => {
    const saved = localStorage.getItem('ctrlfit_active_workout');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state && state.startTime) {
          setPendingWorkout(state);
          setShowResumeDialog(true);
        }
      } catch (e) {
        console.error('Error parsing saved workout session:', e);
        localStorage.removeItem('ctrlfit_active_workout');
      }
    }
  }, []);

  // Fetch routine if ID is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routineId = params.get('routineId');
    const edit = params.get('edit') === 'true';
    const aId = params.get('assignmentId');

    if (aId) setAssignmentId(aId);

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
          
          // Buscar historial de pesos del alumno para estos ejercicios
          const { data: { session } } = await supabase.auth.getSession();
          let userLastWeights: Record<string, { weight: number, reps: number }[]> = {};

          if (session?.user?.id) {
            const { data: lastSessions } = await supabase
              .from('workout_sessions')
              .select('id')
              .eq('user_id', session.user.id)
              .order('end_time', { ascending: false })
              .limit(15);

            if (lastSessions && lastSessions.length > 0) {
              const { data: logs } = await supabase
                .from('workout_logs')
                .select('exercise_id, weight, reps, set_number, session_id')
                .in('session_id', lastSessions.map(s => s.id))
                .order('set_number', { ascending: true });

              if (logs && logs.length > 0) {
                const exerciseSessionMap: Record<string, string> = {};
                for (const s of lastSessions) {
                  const sessionLogs = logs.filter(l => l.session_id === s.id);
                  for (const log of sessionLogs) {
                    if (!exerciseSessionMap[log.exercise_id]) {
                      exerciseSessionMap[log.exercise_id] = s.id;
                    }
                  }
                }

                Object.keys(exerciseSessionMap).forEach(exId => {
                  const targetSessionId = exerciseSessionMap[exId];
                  userLastWeights[exId] = logs
                    .filter(l => l.exercise_id === exId && l.session_id === targetSessionId)
                    .map(l => ({ weight: l.weight, reps: l.reps }));
                });
              }
            }
          }

          const mappedExercises = routine.routine_exercises.map((re: any) => {
            const personalSets = userLastWeights[re.exercise_id];

            const sets = re.sets_data && Array.isArray(re.sets_data) && re.sets_data.length > 0
              ? re.sets_data.map((s: any) => ({
                  weight: s.weight?.toString() || '',
                  reps: s.reps?.toString() || '',
                  completed: false
                }))
              : personalSets && personalSets.length > 0
                ? Array.from({ length: re.sets || 1 }).map((_, idx) => {
                    const pSet = personalSets[idx] || personalSets[personalSets.length - 1];
                    return {
                      weight: pSet.weight?.toString() || '',
                      reps: pSet.reps?.toString() || re.reps?.toString() || '',
                      completed: false
                    };
                  })
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

    const fetchMuscleGroups = async () => {
      const { data, error } = await supabase.from('muscle_groups').select('id, name');
      if (!error && data) setMuscleGroups(data);
    };
    fetchMuscleGroups();
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
    
    // El cronómetro y el entrenamiento en vivo se calculan desde el instante actual de la computadora
    setStartTime(new Date());
    setStatus('active');
  };

  const resumeWorkout = () => {
    if (!pendingWorkout) return;
    setStartTime(new Date(pendingWorkout.startTime));
    setRoutineName(pendingWorkout.routineName);
    setSelectedDate(pendingWorkout.selectedDate);
    setIsNewRoutine(pendingWorkout.isNewRoutine);
    setIsEditMode(pendingWorkout.isEditMode);
    setCurrentRoutineId(pendingWorkout.currentRoutineId);
    setAssignmentId(pendingWorkout.assignmentId);
    setSessionExercises(pendingWorkout.sessionExercises);
    setStatus('active');
    setShowResumeDialog(false);
    setPendingWorkout(null);
  };

  const discardSavedWorkout = () => {
    localStorage.removeItem('ctrlfit_active_workout');
    setShowResumeDialog(false);
    setPendingWorkout(null);
  };

  const discardActiveWorkout = () => {
    if (window.confirm('¿Estás seguro de que deseas descartar el entrenamiento actual? Todo el progreso de esta sesión se perderá.')) {
      localStorage.removeItem('ctrlfit_active_workout');
      setStatus('planning');
      setStartTime(null);
      setElapsedTime(0);
      window.location.reload();
    }
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
      localStorage.removeItem('ctrlfit_active_workout');
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

      // Si venimos de una asignación del calendario, marcarla como completada
      if (assignmentId) {
        await supabase
          .from('routine_assignments')
          .update({ completed: true })
          .eq('id', assignmentId);
      }

      localStorage.removeItem('ctrlfit_active_workout');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error:', error);
      setStatus('active');
    }
  };

  const handleCreateNewExercise = async () => {
    if (!newExerciseName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: newExerciseName,
          muscle_group_id: selectedMuscleGroup || null
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar lista local de ejercicios
      setExercises(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Añadir a la sesión actual
      addExercise(data);
      
      // Limpiar y cerrar
      setNewExerciseName('');
      setSelectedMuscleGroup('');
      setIsCreatingExercise(false);
      setShowExerciseSelector(false);
    } catch (error) {
      console.error('Error creating exercise:', error);
      alert('Error al crear el ejercicio. Verifica que tengas permisos de entrenador.');
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
      {/* Resume Dialog / Banner */}
      {showResumeDialog && pendingWorkout && (
        <Card className="bg-zinc-950 border-primary/30 p-6 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.07)] flex flex-col md:flex-row justify-between items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-white text-lg">Entrenamiento en Curso Detectado</h4>
              <p className="text-sm text-gray-400 mt-1">
                Tenías un entrenamiento activo de <strong className="text-primary">"{pendingWorkout.routineName}"</strong> que comenzó el {new Date(pendingWorkout.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto justify-end">
            <Button variant="ghost" className="text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 hover:bg-red-500/10 flex-1 md:flex-none px-6" onClick={discardSavedWorkout}>
              Descartar
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-black font-bold flex-1 md:flex-none px-6" onClick={resumeWorkout}>
              Reanudar
            </Button>
          </div>
        </Card>
      )}

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
            <DatePicker 
              value={selectedDate}
              onChange={setSelectedDate}
              disabled={status === 'active'}
              className="w-full md:w-[240px]"
            />
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
              <div className="flex gap-2 w-full">
                <Button variant="ghost" className="flex-1 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 hover:bg-red-500/10" onClick={discardActiveWorkout} disabled={status === 'saving'}>
                  Descartar
                </Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold" onClick={finishWorkout} disabled={status === 'saving'}>
                  {status === 'saving' ? <Loader2 className="animate-spin mr-2" /> : <Square className="mr-2 h-4 w-4 fill-current" />}
                  Finalizar
                </Button>
              </div>
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
                <CardTitle>{isCreatingExercise ? 'Crear Nuevo Ejercicio' : 'Añadir Ejercicio'}</CardTitle>
                <Button variant="ghost" onClick={() => {
                  setShowExerciseSelector(false);
                  setIsCreatingExercise(false);
                }}>X</Button>
              </div>
              {!isCreatingExercise && (
                <Input placeholder="Buscar ejercicio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-4" />
              )}
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {isCreatingExercise ? (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Ejercicio</label>
                    <Input 
                      placeholder="Ej: Press de Banca Inclinado" 
                      value={newExerciseName} 
                      onChange={(e) => setNewExerciseName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Grupo Muscular (Opcional)</label>
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                      value={selectedMuscleGroup}
                      onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {muscleGroups.map(mg => (
                        <option key={mg.id} value={mg.id}>{mg.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setIsCreatingExercise(false)}>
                      Cancelar
                    </Button>
                    <Button className="flex-1 bg-primary text-black font-bold" onClick={handleCreateNewExercise}>
                      Guardar y Añadir
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1 mb-4">
                    {exercises
                      .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(e => (
                        <Button key={e.id} variant="ghost" className="w-full justify-start h-12 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => addExercise(e)}>
                          {e.name}
                        </Button>
                      ))
                    }
                    {exercises.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No se encontraron ejercicios.</p>
                      </div>
                    )}
                  </div>
                  
                  {isTrainer && (
                    <div className="border-t border-white/10 pt-4 mt-2">
                      <Button 
                        className="w-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black font-bold transition-all"
                        onClick={() => setIsCreatingExercise(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Crear "{searchTerm || 'Nuevo Ejercicio'}"
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
