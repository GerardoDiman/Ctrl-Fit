import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, Check, Save, Play, Square, Loader2, Calendar as CalendarIcon, X, RefreshCw, Info, Dumbbell, Activity, Cpu, ArrowLeft, Edit } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { showAlert, showConfirm, showToast } from '@/lib/customAlert';

interface Set {
  weight: string;
  reps: string;
  completed: boolean;
}

interface WorkoutExercise {
  id: string;
  name: string;
  sets: Set[];
  weightUnit?: 'kg' | 'lb';
}

interface HelpExerciseData {
  name: string;
  description: string | null;
  image_url: string | null;
  muscle_groups: {
    name: string;
    description: string | null;
    image_url: string | null;
  } | null;
  machines: {
    name: string;
    description: string | null;
    image_url: string | null;
  } | null;
}

interface ExerciseOption {
  id: string;
  name: string;
}

type SessionStatus = 'planning' | 'active' | 'saving';

const formatDateFriendly = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {
    console.error(e);
  }
  return dateStr;
};

export const WorkoutSession = () => {
  const [status, setStatus] = useState<SessionStatus>('planning');
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [sessionExercises, setSessionExercises] = useState<WorkoutExercise[]>([]);
  const [replacingExerciseIndex, setReplacingExerciseIndex] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Help Modal States
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loadingHelpId, setLoadingHelpId] = useState<string | null>(null);
  const [helpData, setHelpData] = useState<HelpExerciseData | null>(null);
  const [activeHelpTab, setActiveHelpTab] = useState<'exercise' | 'machine' | 'muscle'>('exercise');
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
  const [isTemplateEditorMode, setIsTemplateEditorMode] = useState(false);
  const [myRoutines, setMyRoutines] = useState<any[]>([]);
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [isEditingActiveSession, setIsEditingActiveSession] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  
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

  // Auto-adjust textarea height to fit content dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [routineName, status]);

  // Medir la altura de la cabecera pegajosa dinámicamente
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    const timer = setTimeout(updateHeaderHeight, 200);
    
    window.addEventListener('resize', updateHeaderHeight);
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      clearTimeout(timer);
    };
  }, [status, routineName, sessionExercises.length]);

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

  // Fetch routine if ID is in URL, or load my routines for the welcome screen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routineId = params.get('routineId');
    const edit = params.get('edit') === 'true';
    const aId = params.get('assignmentId');

    if (aId) setAssignmentId(aId);
    if (edit) setIsTemplateEditorMode(true);

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
              weight_unit,
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
              weightUnit: re.weight_unit || 'kg',
              sets
            };
          });
          setSessionExercises(mappedExercises);
        }
      };
      loadRoutine();
    } else if (!edit) {
      // Si entramos a entrenar sin rutina específica, cargar las rutinas del alumno para la pantalla de bienvenida
      const fetchMyRoutines = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data, error } = await supabase
          .from('routines')
          .select(`
            id,
            name,
            description,
            routine_exercises (id)
          `)
          .or(`student_id.eq.${session.user.id},student_id.is.null`)
          .order('name');
          
        if (!error && data) {
          setMyRoutines(data);
        }
      };
      fetchMyRoutines();
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

  const startWorkout = async () => {
    if (sessionExercises.length === 0) {
      await showAlert('Programa al menos un ejercicio antes de empezar.', 'Atención', 'warning');
      return;
    }
    
    // El cronómetro y el entrenamiento en vivo se calculan desde el instante actual de la computadora
    setStartTime(new Date());
    setStatus('active');
  };

  const startFreeWorkout = () => {
    setRoutineName('Entrenamiento Libre');
    setSessionExercises([]);
    setStartTime(new Date());
    setStatus('active');
  };

  const startQuickRoutine = async (routineId: string) => {
    const routine = myRoutines.find(r => r.id === routineId);
    if (!routine) return;
    
    setRoutineName(routine.name);
    setCurrentRoutineId(routineId);
    
    try {
      const { data, error } = await supabase
        .from('routine_exercises')
        .select('*, exercises(name)')
        .eq('routine_id', routineId)
        .order('order_index');

      if (error) throw error;
      
      if (data) {
        const mapped = data.map((rx: any) => {
          const sets = rx.sets_data && Array.isArray(rx.sets_data) && rx.sets_data.length > 0
            ? rx.sets_data.map((s: any) => ({
                weight: s.weight?.toString() || '',
                reps: s.reps?.toString() || '',
                completed: false
              }))
            : Array.from({ length: rx.sets || 4 }).map(() => ({
                weight: rx.weight?.toString() || '',
                reps: rx.reps?.toString() || '',
                completed: false
              }));

          return {
            id: rx.exercise_id,
            name: rx.exercises.name,
            weightUnit: rx.weight_unit || 'kg',
            sets
          };
        });
        
        setSessionExercises(mapped);
      }
    } catch (err) {
      console.error('Error al cargar rutina rápida:', err);
      await showAlert('Error al cargar la rutina.', 'Error', 'error');
    }
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

  const discardActiveWorkout = async () => {
    if (await showConfirm('¿Estás seguro de que deseas descartar el entrenamiento actual? Todo el progreso de esta sesión se perderá.', 'Descartar Entrenamiento', 'danger', 'DESCARTAR', 'CANCELAR')) {
      localStorage.removeItem('ctrlfit_active_workout');
      setStatus('planning');
      setStartTime(null);
      setElapsedTime(0);
      window.location.reload();
    }
  };

  const saveRoutine = async () => {
    if (sessionExercises.length === 0) {
      await showAlert('Agrega ejercicios para guardar la rutina.', 'Rutina Vacía', 'warning');
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
          weight_unit: ex.weightUnit || 'kg',
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

      await showAlert(isEditMode ? 'Rutina actualizada correctamente.' : 'Rutina guardada correctamente.', 'Éxito', 'success');
      localStorage.removeItem('ctrlfit_active_workout');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error completo en saveRoutine:', error);
      await showAlert('Error al guardar: ' + (error as any).message, 'Error de Guardado', 'error');
      setStatus('planning');
    }
  };

  const finishWorkout = async () => {
    const confirm = await showConfirm(
      '¿Estás seguro de que deseas finalizar tu entrenamiento de hoy y guardar tu progreso?',
      'Finalizar Entrenamiento',
      'question',
      'SÍ, FINALIZAR',
      'CANCELAR'
    );
    if (!confirm) return;

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
          end_time: endWorkoutTime.toISOString(),
          routine_id: currentRoutineId || null,
          assignment_id: assignmentId || null
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
          weight_unit: ex.weightUnit || 'kg',
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
      handleSelectExercise(data);
      
      // Limpiar y cerrar
      setNewExerciseName('');
      setSelectedMuscleGroup('');
      setIsCreatingExercise(false);
      setShowExerciseSelector(false);
    } catch (error) {
      console.error('Error creating exercise:', error);
      await showAlert('Error al crear el ejercicio. Verifica que tengas permisos de entrenador.', 'Error de Permiso', 'error');
    }
  };

  const fetchExerciseHelpData = async (exerciseId: string) => {
    setLoadingHelpId(exerciseId);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          name,
          description,
          image_url,
          muscle_groups (name, description, image_url),
          machines (name, description, image_url)
        `)
        .eq('id', exerciseId)
        .single();
      
      if (!error && data) {
        setHelpData(data as any);
        setActiveHelpTab('exercise');
        setShowHelpModal(true);
      } else {
        await showAlert("No se pudo cargar la información de ayuda de este ejercicio.", "Ayuda de Ejercicio", "warning");
      }
    } catch (e) {
      console.error('Error fetching exercise help data:', e);
      await showAlert("Error al conectar con la base de datos.", "Error de Conexión", "error");
    } finally {
      setLoadingHelpId(null);
    }
  };

  const fetchLastWeightsForExercise = async (userId: string, exerciseId: string) => {
    try {
      const { data: userSessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .order('end_time', { ascending: false })
        .limit(10);

      if (userSessions && userSessions.length > 0) {
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('session_id, weight, reps, weight_unit, set_number')
          .in('session_id', userSessions.map(s => s.id))
          .eq('exercise_id', exerciseId)
          .order('session_id', { ascending: false })
          .order('set_number', { ascending: true });

        if (logs && logs.length > 0) {
          const mostRecentSessionId = logs[0].session_id;
          const targetLogs = logs.filter(l => l.session_id === mostRecentSessionId);
          return targetLogs.map(l => ({
            weight: l.weight !== null ? l.weight.toString() : '',
            reps: l.reps !== null ? l.reps.toString() : '',
            weightUnit: (l.weight_unit || 'kg') as 'kg' | 'lb'
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching last weights for exercise:', e);
    }
    return null;
  };

  const handleSelectExercise = async (exercise: ExerciseOption) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    let setsData: Set[] = [{ weight: '', reps: '', completed: false }];
    let weightUnit: 'kg' | 'lb' = 'kg';

    if (userId) {
      const history = await fetchLastWeightsForExercise(userId, exercise.id);
      if (history && history.length > 0) {
        setsData = history.map(h => ({
          weight: h.weight,
          reps: h.reps,
          completed: false
        }));
        weightUnit = history[0].weightUnit || 'kg';
      } else if (replacingExerciseIndex !== null) {
        const originalSetsCount = sessionExercises[replacingExerciseIndex].sets.length;
        setsData = Array.from({ length: originalSetsCount }).map(() => ({
          weight: '',
          reps: '',
          completed: false
        }));
      }
    }

    if (replacingExerciseIndex !== null) {
      const updated = [...sessionExercises];
      updated[replacingExerciseIndex] = {
        id: exercise.id,
        name: exercise.name,
        sets: setsData,
        weightUnit
      };
      setSessionExercises(updated);
      setReplacingExerciseIndex(null);
    } else {
      setSessionExercises([...sessionExercises, {
        id: exercise.id,
        name: exercise.name,
        weightUnit,
        sets: setsData
      }]);
    }
    setShowExerciseSelector(false);
  };

  const updateSet = (exIdx: number, sIdx: number, field: keyof Set, value: any) => {
    const updated = [...sessionExercises];
    updated[exIdx].sets[sIdx] = { ...updated[exIdx].sets[sIdx], [field]: value };
    setSessionExercises(updated);
  };

  const removeSet = async (exIdx: number, sIdx: number) => {
    const updated = [...sessionExercises];
    if (updated[exIdx].sets.length > 1) {
      const exercise = { ...updated[exIdx] };
      exercise.sets = exercise.sets.filter((_, i) => i !== sIdx);
      updated[exIdx] = exercise;
      setSessionExercises(updated);
    } else {
      await showAlert('Un ejercicio debe tener al menos una serie. Si deseas quitar el ejercicio completo, usa el botón de eliminar de arriba.', 'Atención', 'warning');
    }
  };

  const completedExercisesCount = sessionExercises.filter(ex => 
    ex.sets.every(set => set.completed)
  ).length;

  const isTrainingWithoutParams = !currentRoutineId && !isTemplateEditorMode && status === 'planning';

  if (isTrainingWithoutParams) {
    return (
      <div className="space-y-6 pb-20 pt-6 max-w-2xl mx-auto">
        <header className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-bold uppercase tracking-wider mb-1 justify-center sm:justify-start">
              <a href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
              </a>
            </div>
            <h1 className="text-3xl font-extrabold font-heading text-white">Comenzar Entrenamiento</h1>
            <p className="text-sm text-gray-400 mt-1">Elige cómo quieres registrar tu sesión de hoy.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {/* Opción A: Entrenamiento Libre */}
          <Card className="bg-zinc-950 border-white/5 hover:border-primary/20 transition-all p-6 cursor-pointer group flex flex-col sm:flex-row items-center justify-between gap-6" onClick={startFreeWorkout}>
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row w-full">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all shrink-0">
                <Plus className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Entrenamiento Libre</h3>
                <p className="text-xs text-gray-400">
                  Inicia una sesión de entrenamiento vacía en vivo y añade los ejercicios sobre la marcha mientras los realizas.
                </p>
              </div>
            </div>
          </Card>

          {/* Opción B: Mis Rutinas Guardadas */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Iniciar con una de mis rutinas</h3>
            {myRoutines.length === 0 ? (
              <Card className="bg-zinc-950 border-white/5 p-8 text-center">
                <Dumbbell className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <h4 className="font-bold text-white mb-1">No tienes rutinas creadas</h4>
                <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">
                  Diseña tus rutinas primero en la sección "Mis Rutinas" para cargarlas y empezar a entrenar rápidamente.
                </p>
                <a href="/dashboard/routines" className="inline-flex items-center gap-1.5 bg-primary text-black hover:bg-primary/90 font-bold px-4 py-2 rounded-sm text-xs transition-colors">
                  Ir a Mis Rutinas
                </a>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {myRoutines.map((routine) => (
                  <Card key={routine.id} className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white truncate text-base">{routine.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {routine.routine_exercises?.length || 0} {routine.routine_exercises?.length === 1 ? 'ejercicio' : 'ejercicios'}
                      </p>
                    </div>
                    <Button 
                      onClick={() => startQuickRoutine(routine.id)}
                      className="bg-primary text-black hover:bg-primary/90 font-bold h-9 text-xs shrink-0 px-4 cursor-pointer"
                    >
                      <Dumbbell className="h-3 w-3 mr-1" /> Preparar
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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

      {/* Sticky Header Wrapper (Masks content scrolling behind) */}
      <div 
        ref={headerRef}
        className="sticky top-0 z-20 pt-4 pb-2 -mx-4 px-4 md:-mx-6 md:px-6 transition-all duration-300"
        style={{ backgroundColor: 'var(--color-background, #111508)' }}
      >
        {/* Dynamic Header Card */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-2xl space-y-4">
        {/* Fila 1: Información Principal de la Rutina (Icono + Título + Badges + Cronómetro adaptativo) */}
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`p-4 rounded-full transition-all duration-500 ${status === 'active' ? 'bg-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.4)]' : 'bg-white/5'}`}>
                <Clock className={`${status === 'active' ? 'text-black animate-spin-slow' : 'text-gray-500'} h-8 w-8`} />
              </div>
              {/* Cronómetro para móvil (debajo del icono) */}
              {status === 'active' && (
                <div className="md:hidden text-center bg-primary/10 border border-primary/20 rounded-lg py-0.5 px-2 shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.03)] w-full">
                  <div className="text-[11px] font-black font-heading tabular-nums text-primary leading-tight">
                    {formatTime(elapsedTime)}
                  </div>
                  <div className="text-[7px] font-extrabold text-gray-400 uppercase tracking-widest text-center mt-0.5 leading-none">
                    Tiempo
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {status === 'active' ? (
                <h2 className="text-xl md:text-2xl font-bold text-white leading-tight break-words mb-1">
                  {routineName}
                </h2>
              ) : (
                <textarea 
                  ref={textareaRef}
                  value={routineName} 
                  onChange={(e) => setRoutineName(e.target.value)}
                  className="bg-transparent border-none text-2xl font-bold p-0 focus-visible:ring-0 text-white w-full resize-none focus:outline-none focus:ring-0 break-words leading-tight overflow-hidden mb-1"
                  placeholder="Nombre del Entrenamiento"
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <span className="text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                  {isTemplateEditorMode ? 'Diseño de Plantilla' : (status === 'planning' ? 'Planificación' : 'En Vivo')}
                </span>
                {status === 'active' && (
                  <span className="text-white px-2 py-0.5 bg-white/5 border border-white/10 rounded-full font-extrabold normal-case">
                    {completedExercisesCount} de {sessionExercises.length} completados
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3" />
                  <span>
                    {status === 'active' ? (
                      <>
                        {isNewRoutine ? 'Nueva Rutina' : 'Rutina Programada'} • <span className="text-gray-400 font-normal normal-case">{formatDateFriendly(selectedDate)}</span>
                      </>
                    ) : (
                      isTemplateEditorMode 
                        ? (isEditMode ? `Modificando Plantilla` : 'Nueva Plantilla Personalizada') 
                        : (isEditMode ? `Editando: ${routineName}` : (isNewRoutine ? 'Nueva Rutina - Hoy' : `Programado: ${creationDate}`))
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cronómetro premium en la cabecera adhesiva (sólo escritorio) */}
          {status === 'active' && (
            <div className="hidden md:block text-right shrink-0 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.05)]">
              <div className="text-3xl font-black font-heading tabular-nums text-primary">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center mt-0.5">
                Tiempo
              </div>
            </div>
          )}
        </div>

        {/* Separador Sutil */}
        <div className="border-t border-white/5 pt-2"></div>

        {/* Fila 2: Selector de Fecha y Controles de la Sesión */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          {/* Calendar Picker - Execution Date (Se oculta al iniciar entrenamiento activo) */}
          {status !== 'active' && (
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-gray-500 uppercase ml-1">Fecha de Entrenamiento</span>
              <DatePicker 
                value={selectedDate}
                onChange={setSelectedDate}
                disabled={status === 'active'}
                className="w-full sm:w-[240px]"
              />
            </div>
          )}

          <div className="flex gap-3 w-full sm:w-auto ml-auto">
            {status === 'planning' ? (
              <>
                {isTemplateEditorMode ? (
                  <>
                    <Button variant="ghost" className="flex-1 sm:flex-none text-gray-400 hover:text-white border border-white/5 hover:border-white/10" onClick={() => window.location.href = '/dashboard/routines'}>
                      Volver
                    </Button>
                    <Button className="flex-1 sm:flex-none sm:w-[150px] bg-primary text-black font-bold hover:bg-primary/90" onClick={saveRoutine}>
                      <Save className="mr-2 h-4 w-4" /> {isEditMode ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1 sm:flex-none sm:w-[130px]" onClick={saveRoutine}>
                      <Save className="mr-2 h-4 w-4" /> {isEditMode ? 'Actualizar' : 'Programar'}
                    </Button>
                    <Button className="flex-1 sm:flex-none sm:w-[130px] bg-primary text-black font-bold hover:bg-primary/90" onClick={startWorkout}>
                      <Play className="mr-2 h-4 w-4 fill-current" /> Iniciar
                    </Button>
                  </>
                )}
              </>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  className={`flex-1 sm:flex-none sm:w-[110px] font-bold transition-all ${isEditingActiveSession ? 'bg-primary text-black hover:bg-primary/90 border-primary' : 'text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                  onClick={() => setIsEditingActiveSession(!isEditingActiveSession)}
                  disabled={status === 'saving'}
                >
                  {isEditingActiveSession ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" /> Listo
                    </>
                  ) : (
                    <>
                      <Edit className="mr-1.5 h-4 w-4" /> Editar
                    </>
                  )}
                </Button>
                <Button variant="ghost" className="flex-1 sm:flex-none sm:w-[110px] text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 hover:bg-red-500/10" onClick={discardActiveWorkout} disabled={status === 'saving'}>
                  Descartar
                </Button>
                <Button className="flex-1 sm:flex-none sm:w-[130px] bg-red-600 hover:bg-red-700 text-white font-bold" onClick={finishWorkout} disabled={status === 'saving'}>
                  {status === 'saving' ? <Loader2 className="animate-spin mr-2" /> : <Square className="mr-2 h-4 w-4 fill-current" />}
                  Finalizar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold font-heading">Ejercicios</h3>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {sessionExercises.length} {sessionExercises.length === 1 ? 'Ejercicio' : 'Ejercicios'}
            </div>
        </div>

        {sessionExercises.map((ex, exIdx) => (
          <Card key={exIdx} className="border-white/5 bg-black/20 rounded-xl">
            <div 
              className="sticky z-10 flex flex-row items-center justify-between bg-[#1a2408]/96 backdrop-blur-md py-3 px-4 md:py-4 md:px-6 border-b border-primary/20 rounded-t-xl"
              style={{ top: `${headerHeight}px` }}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="h-7 w-7 md:h-8 md:w-8 text-xs md:text-sm rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {exIdx + 1}
                </div>
                <CardTitle className="text-sm md:text-base font-bold leading-tight break-words min-w-0 flex-1">{ex.name}</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchExerciseHelpData(ex.id)}
                  disabled={loadingHelpId !== null}
                  className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center shrink-0"
                  title="Ayuda Visual e Información"
                >
                  {loadingHelpId === ex.id ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Info className="h-4.5 w-4.5" />
                  )}
                </Button>
                {(status === 'planning' || isEditingActiveSession) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setReplacingExerciseIndex(exIdx);
                      setShowExerciseSelector(true);
                    }}
                    className="h-8 w-8 rounded-full text-primary hover:text-primary hover:bg-primary/10 flex items-center justify-center shrink-0"
                    title="Reemplazar Ejercicio"
                  >
                    <RefreshCw className="h-4.5 w-4.5" />
                  </Button>
                )}
                {(status === 'planning' || isEditingActiveSession) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={async () => {
                      if (await showConfirm('¿Estás seguro de que deseas eliminar este ejercicio de la rutina?', 'Eliminar Ejercicio', 'danger', 'ELIMINAR', 'CANCELAR')) {
                        setSessionExercises(sessionExercises.filter((_, i) => i !== exIdx));
                      }
                    }}
                    className="h-8 w-8 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-12 gap-4 mb-3 text-[10px] font-bold text-gray-500 uppercase items-center">
                    <div className="col-span-2 text-center">Set</div>
                    <div className="col-span-4 flex items-center justify-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Peso</span>
                      <div className="flex border border-white/10 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...sessionExercises];
                            updated[exIdx].weightUnit = 'kg';
                            setSessionExercises(updated);
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-extrabold transition-colors ${
                            (ex.weightUnit || 'kg') === 'kg' 
                              ? 'bg-primary text-black' 
                              : 'bg-black/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          KG
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...sessionExercises];
                            updated[exIdx].weightUnit = 'lb';
                            setSessionExercises(updated);
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-extrabold transition-colors ${
                            ex.weightUnit === 'lb' 
                              ? 'bg-primary text-black' 
                              : 'bg-black/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          LB
                        </button>
                      </div>
                    </div>
                    <div className="col-span-4 text-center">Reps</div>
                    <div className="col-span-2 text-center">{(status === 'planning' || isEditingActiveSession) ? 'Quitar' : 'Log'}</div>
                </div>
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className="grid grid-cols-12 gap-4 items-center mb-2">
                  <div className="col-span-2 text-center font-bold text-gray-500">{setIdx + 1}</div>
                  <div className="col-span-4">
                    <Input 
                      type="number" 
                      value={set.weight} 
                      onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} 
                      className="text-center bg-black/40 h-10" 
                      placeholder={ex.weightUnit === 'lb' ? "0 lb" : "0 kg"} 
                    />
                  </div>
                  <div className="col-span-4">
                    <Input type="number" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} className="text-center bg-black/40 h-10" placeholder="0" />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {(status === 'planning' || isEditingActiveSession) ? (
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
              {(status === 'planning' || isEditingActiveSession) && (
                <Button variant="ghost" className="w-full mt-4 border border-dashed border-white/10" onClick={() => {
                  const updated = [...sessionExercises];
                  updated[exIdx].sets.push({ weight: '', reps: '', completed: false });
                  setSessionExercises(updated);
                }}>
                  + Serie
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {(status === 'planning' || isEditingActiveSession) && !showExerciseSelector && (
          <Button className="w-full h-16 bg-primary/5 border-2 border-dashed border-primary/20 text-primary hover:bg-primary hover:text-black hover:border-primary transition-all duration-300" onClick={() => setShowExerciseSelector(true)}>
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
                <CardTitle>
                  {isCreatingExercise 
                    ? 'Crear Nuevo Ejercicio' 
                    : (replacingExerciseIndex !== null ? 'Reemplazar Ejercicio' : 'Añadir Ejercicio')
                  }
                </CardTitle>
                <Button variant="ghost" onClick={() => {
                  setShowExerciseSelector(false);
                  setIsCreatingExercise(false);
                  setReplacingExerciseIndex(null);
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
                        <Button key={e.id} variant="ghost" className="w-full justify-start h-12 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handleSelectExercise(e)}>
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

      {/* Help Modal */}
      {showHelpModal && helpData && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-primary/30 bg-zinc-950 shadow-[0_0_50px_rgba(var(--color-primary-rgb),0.1)]">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-white/5">
              <div>
                <CardTitle className="text-lg font-bold text-white">Ayuda Visual e Información</CardTitle>
                <CardDescription className="text-xs text-gray-400 mt-0.5">Detalles del catálogo para {helpData.name}</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowHelpModal(false);
                  setHelpData(null);
                }}
                className="h-8 w-8 rounded-full text-gray-500 hover:text-white hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Tabs list selector */}
              <div className="flex border-b border-white/5">
                {(['exercise', 'machine', 'muscle'] as const).map((tab) => {
                  const label = tab === 'exercise' ? 'Ejercicio' : tab === 'machine' ? 'Máquina' : 'Músculo';
                  const active = activeHelpTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveHelpTab(tab)}
                      className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all capitalize ${
                        active 
                          ? 'border-primary text-primary bg-primary/5' 
                          : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeHelpTab === 'exercise' && (
                  <div className="space-y-4">
                    {/* Exercise image or placeholder */}
                    {helpData.image_url ? (
                      <div className="relative group overflow-hidden rounded-lg border border-white/10 h-48 bg-black/40">
                        <img 
                          src={helpData.image_url} 
                          alt={helpData.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-white/5 border-dashed h-48 bg-gradient-to-b from-zinc-950 to-zinc-900 flex flex-col items-center justify-center gap-3 text-gray-500 relative overflow-hidden group">
                        {/* Grid decorative lines */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                        <Dumbbell className="h-10 w-10 text-gray-600 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary/55" />
                        <div className="text-center z-10">
                          <p className="text-xs font-bold text-gray-400">Sin Imagen de Referencia</p>
                          <p className="text-[10px] text-gray-600 mt-1 max-w-[240px]">Puedes subir imágenes para este ejercicio desde la sección de administración del catálogo.</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">{helpData.name}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed max-h-32 overflow-y-auto">
                        {helpData.description || 'Sin descripción adicional para este ejercicio en el catálogo.'}
                      </p>
                    </div>
                  </div>
                )}

                {activeHelpTab === 'machine' && (
                  <div className="space-y-4">
                    {helpData.machines ? (
                      <>
                        {helpData.machines.image_url ? (
                          <div className="relative group overflow-hidden rounded-lg border border-white/10 h-48 bg-black/40">
                            <img 
                              src={helpData.machines.image_url} 
                              alt={helpData.machines.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-white/5 border-dashed h-48 bg-gradient-to-b from-zinc-950 to-zinc-900 flex flex-col items-center justify-center gap-3 text-gray-500 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                            <Cpu className="h-10 w-10 text-gray-600 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary/55" />
                            <div className="text-center z-10">
                              <p className="text-xs font-bold text-gray-400">Sin Imagen de la Máquina</p>
                              <p className="text-[10px] text-gray-600 mt-1 max-w-[240px]">Esta máquina no tiene una imagen asociada en el catálogo de equipamiento.</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">Máquina: {helpData.machines.name}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed max-h-32 overflow-y-auto">
                            {helpData.machines.description || 'Esta máquina no tiene una descripción detallada.'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-white/5 bg-zinc-950/40 p-8 flex flex-col items-center justify-center gap-3 text-gray-500 min-h-[220px]">
                        <Cpu className="h-8 w-8 text-gray-700" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-400">Peso Libre / Sin Máquina</p>
                          <p className="text-[10px] text-gray-600 mt-1 max-w-[240px]">Este ejercicio no requiere una máquina o estación guiada del catálogo.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeHelpTab === 'muscle' && (
                  <div className="space-y-4">
                    {helpData.muscle_groups ? (
                      <>
                        {helpData.muscle_groups.image_url ? (
                          <div className="relative group overflow-hidden rounded-lg border border-white/10 h-48 bg-black/40">
                            <img 
                              src={helpData.muscle_groups.image_url} 
                              alt={helpData.muscle_groups.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-white/5 border-dashed h-48 bg-gradient-to-b from-zinc-950 to-zinc-900 flex flex-col items-center justify-center gap-3 text-gray-500 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                            <Activity className="h-10 w-10 text-gray-600 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary/55" />
                            <div className="text-center z-10">
                              <p className="text-xs font-bold text-gray-400">Sin Imagen Anatómica</p>
                              <p className="text-[10px] text-gray-600 mt-1 max-w-[240px]">No hay un mapa muscular asignado para este grupo muscular en el catálogo.</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">Músculo Principal: {helpData.muscle_groups.name}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed max-h-32 overflow-y-auto">
                            {helpData.muscle_groups.description || 'Este grupo muscular no tiene una descripción detallada en el catálogo.'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-white/5 bg-zinc-950/40 p-8 flex flex-col items-center justify-center gap-3 text-gray-500 min-h-[220px]">
                        <Activity className="h-8 w-8 text-gray-700" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-400">Sin Grupo Muscular Asignado</p>
                          <p className="text-[10px] text-gray-600 mt-1 max-w-[240px]">Este ejercicio no tiene un grupo muscular principal especificado en el catálogo.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
