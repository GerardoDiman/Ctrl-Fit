import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  Edit, 
  Plus, 
  CheckCircle2, 
  X, 
  Save, 
  ArrowLeft,
  ChevronRight,
  Info,
  CalendarDays,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';

interface Session {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  routine_id: string | null;
}

interface Assignment {
  id: string;
  routine_id: string;
  student_id: string;
  trainer_id: string;
  scheduled_date: string;
  completed: boolean | null;
  notes: string | null;
  routines: {
    name: string;
    description: string | null;
  };
}

interface RoutineTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface ExerciseOption {
  id: string;
  name: string;
}

interface FormSet {
  weight: string;
  reps: string;
}

interface FormExercise {
  exerciseId: string;
  name: string;
  sets: FormSet[];
  weightUnit?: 'kg' | 'lb';
}

type ActiveTab = 'sessions' | 'agenda';

export const WorkoutHistory = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sessions');
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<ExerciseOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCompleteAssignmentModalOpen, setIsCompleteAssignmentModalOpen] = useState(false);
  const [showAddExerciseSelector, setShowAddExerciseSelector] = useState(false);

  // Selected entities
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRoutineId, setFormRoutineId] = useState('');
  const [formExercises, setFormExercises] = useState<FormExercise[]>([]);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        await fetchData(session.user.id);
      }
    };
    init();
  }, []);

  const fetchData = async (uid: string) => {
    setLoading(true);
    try {
      // 1. Fetch Completed Workout Sessions
      const { data: sessionData, error: sessionErr } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', uid)
        .order('start_time', { ascending: false });

      if (sessionErr) throw sessionErr;
      setSessions(sessionData || []);

      // 2. Fetch Assignments
      const { data: assignData, error: assignErr } = await supabase
        .from('routine_assignments')
        .select('*, routines(name, description)')
        .eq('student_id', uid)
        .order('scheduled_date', { ascending: false });

      if (assignErr) throw assignErr;
      setAssignments(assignData || []);

      // 3. Fetch Available Routines (templates + custom student routines)
      const { data: routineData, error: routineErr } = await supabase
        .from('routines')
        .select('id, name, description')
        .or(`student_id.eq.${uid},student_id.is.null`)
        .order('name');

      if (routineErr) throw routineErr;
      setRoutines(routineData || []);

      // 4. Fetch Exercises Catalog
      const { data: exerciseData, error: exerciseErr } = await supabase
        .from('exercises')
        .select('id, name')
        .order('name');

      if (exerciseErr) throw exerciseErr;
      setExercisesCatalog(exerciseData || []);

    } catch (e) {
      console.error('Error fetching history data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Fetch routine exercises and load into formExercises state
  const loadRoutineExercisesForForm = async (routineId: string) => {
    if (!routineId) {
      setFormExercises([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('routine_exercises')
        .select('*, exercises(name)')
        .eq('routine_id', routineId)
        .order('order_index');

      if (error) throw error;
      
      if (data) {
        const mapped: FormExercise[] = data.map((rx: any) => {
          const sets = rx.sets_data && Array.isArray(rx.sets_data) && rx.sets_data.length > 0
            ? rx.sets_data.map((s: any) => ({
                weight: s.weight?.toString() || '',
                reps: s.reps?.toString() || ''
              }))
            : Array.from({ length: rx.sets || 4 }).map(() => ({
                weight: rx.weight?.toString() || '',
                reps: rx.reps?.toString() || ''
              }));

          return {
            exerciseId: rx.exercise_id,
            name: rx.exercises.name,
            weightUnit: rx.weight_unit || 'kg',
            sets
          };
        });
        setFormExercises(mapped);
      } else {
        setFormExercises([]);
      }
    } catch (e) {
      console.error('Error loading routine exercises for form:', e);
      setFormExercises([]);
    }
  };

  // Helper: Fetch existing session logs and load into formExercises state
  const loadSessionLogsForForm = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*, exercises(name)')
        .eq('session_id', sessionId)
        .order('set_number');

      if (error) throw error;

      if (data && data.length > 0) {
        // Agrupar logs por exercise_id para reconstruir la estructura FormExercise
        const grouped: Record<string, { name: string; weightUnit?: 'kg' | 'lb'; sets: FormSet[] }> = {};
        
        data.forEach((log: any) => {
          if (!grouped[log.exercise_id]) {
            grouped[log.exercise_id] = {
              name: log.exercises.name,
              weightUnit: log.weight_unit || 'kg',
              sets: []
            };
          }
          grouped[log.exercise_id].sets.push({
            weight: log.weight !== null ? log.weight.toString() : '',
            reps: log.reps !== null ? log.reps.toString() : ''
          });
        });

        const mapped: FormExercise[] = Object.keys(grouped).map(exId => ({
          exerciseId: exId,
          name: grouped[exId].name,
          weightUnit: grouped[exId].weightUnit || 'kg',
          sets: grouped[exId].sets
        }));
        setFormExercises(mapped);
      } else {
        setFormExercises([]);
      }
    } catch (e) {
      console.error('Error loading session logs for form:', e);
      setFormExercises([]);
    }
  };

  const getDurationText = (start: string, end: string) => {
    if (!start || !end) return '0 min';
    try {
      const mins = differenceInMinutes(new Date(end), new Date(start));
      if (mins < 0) return '0 min';
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins} min`;
    } catch (e) {
      return 'N/A';
    }
  };

  const formatDateString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return 'Fecha no válida';
    }
  };

  const formatTimeString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return format(date, "hh:mm a");
    } catch (e) {
      return '00:00';
    }
  };

  // Convert Date object to YYYY-MM-DD in local time
  const getLocalDateString = (dateObj: Date) => {
    return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
  };

  // Convert Date object to HH:MM in local time
  const getLocalTimeString = (dateObj: Date) => {
    return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
  };

  // Combine local Date and Time strings into a single Date object
  const combineDateAndTime = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  };

  // Form Exercises Handlers
  const handleAddFormSet = (exIdx: number) => {
    const updated = [...formExercises];
    updated[exIdx].sets.push({ weight: '', reps: '' });
    setFormExercises(updated);
  };

  const handleRemoveFormSet = (exIdx: number, setIdx: number) => {
    const updated = [...formExercises];
    if (updated[exIdx].sets.length > 1) {
      updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx);
      setFormExercises(updated);
    } else {
      alert('Debe haber al menos una serie. Si deseas quitar el ejercicio completo, usa el botón de eliminar arriba.');
    }
  };

  const handleUpdateFormSet = (exIdx: number, setIdx: number, field: keyof FormSet, value: string) => {
    const updated = [...formExercises];
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
    setFormExercises(updated);
  };

  const handleRemoveFormExercise = (exIdx: number) => {
    setFormExercises(formExercises.filter((_, i) => i !== exIdx));
  };

  const handleAddFormExercise = (ex: ExerciseOption) => {
    if (formExercises.some(fe => fe.exerciseId === ex.id)) {
      alert('Este ejercicio ya está agregado en la sesión.');
      return;
    }
    setFormExercises([
      ...formExercises,
      {
        exerciseId: ex.id,
        name: ex.name,
        weightUnit: 'kg',
        sets: [{ weight: '', reps: '' }]
      }
    ]);
    setShowAddExerciseSelector(false);
    setExerciseSearchTerm('');
  };

  // Open Edit Session Modal
  const handleOpenEdit = async (session: Session) => {
    setSelectedSession(session);
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    
    setFormName(session.name);
    setFormDate(getLocalDateString(start));
    setFormStartTime(getLocalTimeString(start));
    setFormEndTime(getLocalTimeString(end));
    setFormNotes(session.notes || '');
    
    // Cargar los logs actuales de este ejercicio
    setFormExercises([]);
    setIsEditModalOpen(true);
    await loadSessionLogsForForm(session.id);
  };

  // Save Edited Session
  const handleSaveEdit = async () => {
    if (!selectedSession || !userId) return;
    if (!formName.trim() || !formDate || !formStartTime || !formEndTime) {
      alert('Por favor, rellena todos los campos obligatorios.');
      return;
    }

    try {
      const startObj = combineDateAndTime(formDate, formStartTime);
      const endObj = combineDateAndTime(formDate, formEndTime);

      if (endObj < startObj) {
        alert('La hora de fin no puede ser anterior a la hora de inicio.');
        return;
      }

      // 1. Update session row
      const { error: sessionErr } = await supabase
        .from('workout_sessions')
        .update({
          name: formName,
          start_time: startObj.toISOString(),
          end_time: endObj.toISOString(),
          notes: formNotes || null
        })
        .eq('id', selectedSession.id)
        .eq('user_id', userId);

      if (sessionErr) throw sessionErr;

      // 2. Synchronize logs: delete existing and re-insert the modified ones
      await supabase
        .from('workout_logs')
        .delete()
        .eq('session_id', selectedSession.id);

      if (formExercises.length > 0) {
        const logs = formExercises.flatMap((ex) => 
          ex.sets.map((set, idx) => ({
            session_id: selectedSession.id,
            exercise_id: ex.exerciseId,
            set_number: idx + 1,
            weight: parseFloat(set.weight) || 0,
            reps: parseInt(set.reps) || 0,
            weight_unit: ex.weightUnit || 'kg',
            completed: true
          }))
        );
        const { error: logsErr } = await supabase.from('workout_logs').insert(logs);
        if (logsErr) throw logsErr;
      }

      setIsEditModalOpen(false);
      setSelectedSession(null);
      await fetchData(userId);
    } catch (e) {
      console.error('Error saving session edit:', e);
      alert('Error al guardar los cambios.');
    }
  };

  // Delete Completed Session
  const handleDeleteSession = async (sessionId: string) => {
    if (!userId) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este entrenamiento permanentemente de tu historial?')) return;

    try {
      // 1. Delete associated logs first to prevent FK constraint issues
      await supabase
        .from('workout_logs')
        .delete()
        .eq('session_id', sessionId);

      // 2. Delete the session
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchData(userId);
    } catch (e) {
      console.error('Error deleting session:', e);
      alert('Error al eliminar la sesión de entrenamiento.');
    }
  };

  // Open Manual Session Modal
  const handleOpenManual = () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    setFormRoutineId('');
    setFormName('Sesión de Entrenamiento Libre');
    setFormDate(getLocalDateString(now));
    setFormStartTime(getLocalTimeString(now));
    setFormEndTime(getLocalTimeString(oneHourLater));
    setFormNotes('');
    setFormExercises([]);
    setIsManualModalOpen(true);
  };

  // Prefill routine name and load routine exercises into form when selecting template
  const handleRoutineSelect = async (routineId: string) => {
    setFormRoutineId(routineId);
    if (routineId) {
      const routine = routines.find(r => r.id === routineId);
      if (routine) {
        setFormName(routine.name);
      }
      await loadRoutineExercisesForForm(routineId);
    } else {
      setFormName('Sesión de Entrenamiento Libre');
      setFormExercises([]);
    }
  };

  // Save Manual Session Registration
  const handleSaveManual = async () => {
    if (!userId) return;
    if (!formName.trim() || !formDate || !formStartTime || !formEndTime) {
      alert('Por favor, completa los campos obligatorios.');
      return;
    }

    try {
      const startObj = combineDateAndTime(formDate, formStartTime);
      const endObj = combineDateAndTime(formDate, formEndTime);

      if (endObj < startObj) {
        alert('La hora de fin no puede ser anterior a la hora de inicio.');
        return;
      }

      // 1. Insert session
      const { data: newSession, error: sessionErr } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          routine_id: formRoutineId || null,
          name: formName,
          start_time: startObj.toISOString(),
          end_time: endObj.toISOString(),
          notes: formNotes || null
        })
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // 2. Insert exercises logs from state
      if (formExercises.length > 0 && newSession) {
        const logs = formExercises.flatMap((ex) => 
          ex.sets.map((set, idx) => ({
            session_id: newSession.id,
            exercise_id: ex.exerciseId,
            set_number: idx + 1,
            weight: parseFloat(set.weight) || 0,
            reps: parseInt(set.reps) || 0,
            weight_unit: ex.weightUnit || 'kg',
            completed: true
          }))
        );

        if (logs.length > 0) {
          const { error: logsErr } = await supabase.from('workout_logs').insert(logs);
          if (logsErr) throw logsErr;
        }
      }

      setIsManualModalOpen(false);
      await fetchData(userId);
    } catch (e) {
      console.error('Error saving manual session:', e);
      alert('Error al registrar la sesión.');
    }
  };

  // Open Complete Assignment Modal
  const handleOpenCompleteAssignment = async (assign: Assignment) => {
    setSelectedAssignment(assign);
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    setFormDate(assign.scheduled_date);
    setFormStartTime(getLocalTimeString(now));
    setFormEndTime(getLocalTimeString(oneHourLater));
    setFormNotes('');
    
    // Cargar los ejercicios planificados de la rutina
    setFormExercises([]);
    setIsCompleteAssignmentModalOpen(true);
    await loadRoutineExercisesForForm(assign.routine_id);
  };

  // Save Assignment Completion
  const handleSaveCompleteAssignment = async () => {
    if (!selectedAssignment || !userId) return;
    if (!formDate || !formStartTime || !formEndTime) {
      alert('Por favor, rellena las horas de entrenamiento.');
      return;
    }

    try {
      const startObj = combineDateAndTime(formDate, formStartTime);
      const endObj = combineDateAndTime(formDate, formEndTime);

      if (endObj < startObj) {
        alert('La hora de fin no puede ser anterior a la hora de inicio.');
        return;
      }

      // 1. Insert session
      const { data: newSession, error: sessionErr } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          routine_id: selectedAssignment.routine_id,
          name: selectedAssignment.routines.name,
          start_time: startObj.toISOString(),
          end_time: endObj.toISOString(),
          notes: formNotes || null
        })
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // 2. Insert exercises logs from state
      if (formExercises.length > 0 && newSession) {
        const logs = formExercises.flatMap((ex) => 
          ex.sets.map((set, idx) => ({
            session_id: newSession.id,
            exercise_id: ex.exerciseId,
            set_number: idx + 1,
            weight: parseFloat(set.weight) || 0,
            reps: parseInt(set.reps) || 0,
            weight_unit: ex.weightUnit || 'kg',
            completed: true
          }))
        );

        if (logs.length > 0) {
          const { error: logsErr } = await supabase.from('workout_logs').insert(logs);
          if (logsErr) throw logsErr;
        }
      }

      // 3. Mark routine assignment as completed
      const { error: assignErr } = await supabase
        .from('routine_assignments')
        .update({ completed: true })
        .eq('id', selectedAssignment.id)
        .eq('student_id', userId);

      if (assignErr) throw assignErr;

      setIsCompleteAssignmentModalOpen(false);
      setSelectedAssignment(null);
      await fetchData(userId);
    } catch (e) {
      console.error('Error completing assignment:', e);
      alert('Error al completar el entrenamiento.');
    }
  };

  return (
    <div className="space-y-6 pb-20 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">
            <a href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
            </a>
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-white">Historial y Agenda</h1>
          <p className="text-sm text-gray-400">Gestiona tus entrenamientos completados, edita tiempos y completa tareas pendientes.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleOpenManual} className="w-full sm:w-auto bg-primary text-black hover:bg-primary/90 font-bold px-5">
            <Plus className="mr-2 h-4 w-4" /> Registrar Entrenamiento
          </Button>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar flex-nowrap">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'sessions' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="sm:hidden">Sesiones ({sessions.length})</span>
          <span className="hidden sm:inline">Sesiones Realizadas ({sessions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'agenda' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="sm:hidden">Agenda ({assignments.filter(a => !a.completed).length})</span>
          <span className="hidden sm:inline">Planificación y Agenda ({assignments.filter(a => !a.completed).length} pendientes)</span>
        </button>
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : activeTab === 'sessions' ? (
        /* Pestaña: Sesiones Completadas */
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card className="bg-zinc-950 border-white/5 py-12 text-center">
              <CardContent className="flex flex-col items-center justify-center gap-3">
                <Info className="h-10 w-10 text-gray-600" />
                <h3 className="text-lg font-bold text-white">No tienes entrenamientos registrados</h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Aquí aparecerán todas tus sesiones completadas. Puedes iniciar una rutina en vivo desde el Dashboard o registrar un entrenamiento pasado manualmente.
                </p>
                <Button onClick={handleOpenManual} className="mt-4 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black font-bold">
                  Registrar mi primer sesión
                </Button>
              </CardContent>
            </Card>
          ) : (
            sessions.map(session => (
              <Card key={session.id} className="bg-zinc-950 border-white/5 hover:border-white/10 transition-colors overflow-hidden group">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 gap-4 md:gap-6">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-lg text-white truncate">{session.name}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1.5 capitalize">
                        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                        {formatDateString(session.start_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {formatTimeString(session.start_time)} - {formatTimeString(session.end_time)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-white/5 font-semibold text-[10px] text-gray-400">
                        Duración: {getDurationText(session.start_time, session.end_time)}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-gray-500 mt-2 p-2.5 bg-black/40 rounded-lg border border-white/5 italic">
                        "{session.notes}"
                      </p>
                    )}
                  </div>
                  
                  {/* Botones de Acción */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                      onClick={() => handleOpenEdit(session)}
                      title="Editar Sesión"
                    >
                      <Edit className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                      onClick={() => handleDeleteSession(session.id)}
                      title="Eliminar Sesión"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Pestaña: Agenda y Asignaciones */
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <Card className="bg-zinc-950 border-white/5 py-12 text-center">
              <CardContent className="flex flex-col items-center justify-center gap-3">
                <CalendarDays className="h-10 w-10 text-gray-600" />
                <h3 className="text-lg font-bold text-white">No tienes entrenamientos agendados</h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Aquí verás las rutinas que te asigne tu entrenador en el calendario. Actualmente no tienes ninguna programación.
                </p>
              </CardContent>
            </Card>
          ) : (
            assignments.map(assign => {
              const isPast = new Date(assign.scheduled_date + 'T23:59:59') < new Date();
              return (
                <Card key={assign.id} className={`bg-zinc-950 border-white/5 overflow-hidden transition-colors ${
                  assign.completed ? 'opacity-65' : ''
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-white text-base">{assign.routines.name}</h4>
                        {assign.completed ? (
                          <span className="text-[9px] bg-green-500/15 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Completada
                          </span>
                        ) : (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            isPast 
                              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                              : 'bg-primary/10 border-primary/20 text-primary'
                          }`}>
                            {isPast ? 'Pendiente Pasada' : 'Pendiente'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-500" />
                        Programada: {format(new Date(assign.scheduled_date + 'T12:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      {!assign.completed && (
                        <Button 
                          onClick={() => handleOpenCompleteAssignment(assign)}
                          className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black font-bold h-9 text-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Marcar Realizada
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: EDITAR ENTRENAMIENTO */}
      {isEditModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-[95%] sm:w-full max-w-lg bg-zinc-950 border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Edit className="h-5 w-5 text-primary" /> Editar Sesión
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Modifica los detalles de la sesión completada.</p>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white rounded-full h-8 w-8" onClick={() => setIsEditModalOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Entrenamiento</label>
                  <Input 
                    value={formName} 
                    onChange={(e) => setFormName(e.target.value)} 
                    placeholder="Ej: Rutina de Pecho"
                    className="bg-black/40 border-white/10 h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase font-heading">Fecha</label>
                  <DatePicker 
                    value={formDate}
                    onChange={setFormDate}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Hora de Inicio</label>
                    <TimePicker 
                      value={formStartTime}
                      onChange={setFormStartTime}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Hora de Fin</label>
                    <TimePicker 
                      value={formEndTime}
                      onChange={setFormEndTime}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Notas y Rendimiento (Opcional)</label>
                  <textarea 
                    value={formNotes} 
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="¿Cómo te sentiste? Ej: Completé el circuito aunque modifiqué repeticiones."
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none text-white h-20 resize-none"
                  />
                </div>

                {/* Sección de Ejercicios */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase">Ejercicios y Series</label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary text-xs hover:bg-primary/10 h-8"
                      onClick={() => setShowAddExerciseSelector(true)}
                    >
                      + Añadir Ejercicio
                    </Button>
                  </div>

                  <div className="space-y-2.5 pr-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {formExercises.map((ex, exIdx) => (
                      <div key={exIdx} className="bg-black/30 border border-white/5 rounded-lg p-2.5 sm:p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white truncate">{ex.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormExercise(exIdx)}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Series */}
                        <div className="space-y-1.5">
                          {ex.sets.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold px-1 mb-1 select-none">
                              <span className="w-9 shrink-0">SERIE</span>
                              <div className="flex-1 max-w-[70px] flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formExercises];
                                    updated[exIdx].weightUnit = 'kg';
                                    setFormExercises(updated);
                                  }}
                                  className={`px-1 py-0.5 text-[8px] font-extrabold rounded ${
                                    (ex.weightUnit || 'kg') === 'kg'
                                      ? 'bg-primary text-black font-black'
                                      : 'bg-white/5 text-gray-500 hover:text-white'
                                  }`}
                                >
                                  KG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formExercises];
                                    updated[exIdx].weightUnit = 'lb';
                                    setFormExercises(updated);
                                  }}
                                  className={`px-1 py-0.5 text-[8px] font-extrabold rounded ${
                                    ex.weightUnit === 'lb'
                                      ? 'bg-primary text-black font-black'
                                      : 'bg-white/5 text-gray-500 hover:text-white'
                                  }`}
                                >
                                  LB
                                </button>
                              </div>
                              <span className="flex-1 max-w-[70px] text-center">REPS</span>
                              <span className="w-8 shrink-0"></span>
                            </div>
                          )}
                          {ex.sets.map((set, setIdx) => (
                            <div key={setIdx} className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                              <span className="text-gray-500 font-semibold w-9 shrink-0">Set {setIdx + 1}</span>
                              <Input
                                type="number"
                                placeholder={ex.weightUnit === 'lb' ? "LB" : "KG"}
                                value={set.weight}
                                onChange={(e) => handleUpdateFormSet(exIdx, setIdx, 'weight', e.target.value)}
                                className="h-8 bg-black/40 text-center flex-1 max-w-[70px] text-xs border-white/10 px-1"
                              />
                              <Input
                                type="number"
                                placeholder="Reps"
                                value={set.reps}
                                onChange={(e) => handleUpdateFormSet(exIdx, setIdx, 'reps', e.target.value)}
                                className="h-8 bg-black/40 text-center flex-1 max-w-[70px] text-xs border-white/10 px-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFormSet(exIdx, setIdx)}
                                className="text-gray-500 hover:text-red-400 ml-auto h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddFormSet(exIdx)}
                            className="text-[10px] text-primary hover:underline font-bold px-1 py-0.5 mt-1 block"
                          >
                            + Serie
                          </button>
                        </div>
                      </div>
                    ))}

                    {formExercises.length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-4">No hay ejercicios en esta sesión.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 mt-2 border-t border-white/5 shrink-0">
                <Button variant="outline" className="w-full sm:flex-1 h-10 text-gray-400 border-white/10 hover:bg-white/5 hover:text-white" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button className="w-full sm:flex-1 bg-primary text-black font-bold h-10 hover:bg-primary/90" onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" /> Guardar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 2: REGISTRO MANUAL DE ENTRENAMIENTO */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-[95%] sm:w-full max-w-lg bg-zinc-950 border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" /> Registrar Entrenamiento
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Registra un entrenamiento realizado en el pasado.</p>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white rounded-full h-8 w-8" onClick={() => setIsManualModalOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cargar desde Rutina Plantilla</label>
                  <select 
                    value={formRoutineId}
                    onChange={(e) => handleRoutineSelect(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg h-10 px-3 text-sm focus:ring-1 focus:ring-primary outline-none text-white"
                  >
                    <option value="">-- Entrenamiento Libre (Personalizado) --</option>
                    {routines.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-500 block leading-tight">
                    * Al seleccionar una plantilla se precargarán sus ejercicios. Puedes modificarlos, añadir nuevos o quitar series libremente.
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Entrenamiento</label>
                  <Input 
                    value={formName} 
                    onChange={(e) => setFormName(e.target.value)} 
                    placeholder="Ej: Entrenamiento Libre en el Gym"
                    className="bg-black/40 border-white/10 h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase font-heading">Fecha</label>
                  <DatePicker 
                    value={formDate}
                    onChange={setFormDate}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Hora de Inicio</label>
                    <TimePicker 
                      value={formStartTime}
                      onChange={setFormStartTime}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Hora de Fin</label>
                    <TimePicker 
                      value={formEndTime}
                      onChange={setFormEndTime}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Notas y Observaciones</label>
                  <textarea 
                    value={formNotes} 
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ej: No tenía datos móviles pero hice mi rutina en el gimnasio."
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none text-white h-16 resize-none"
                  />
                </div>

                {/* Sección de Ejercicios */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase">Ejercicios y Series</label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary text-xs hover:bg-primary/10 h-8"
                      onClick={() => setShowAddExerciseSelector(true)}
                    >
                      + Añadir Ejercicio
                    </Button>
                  </div>

                  <div className="space-y-2.5 pr-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {formExercises.map((ex, exIdx) => (
                      <div key={exIdx} className="bg-black/30 border border-white/5 rounded-lg p-2.5 sm:p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white truncate">{ex.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormExercise(exIdx)}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Series */}
                        <div className="space-y-1.5">
                          {ex.sets.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold px-1 mb-1 select-none">
                              <span className="w-9 shrink-0">SERIE</span>
                              <div className="flex-1 max-w-[70px] flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formExercises];
                                    updated[exIdx].weightUnit = 'kg';
                                    setFormExercises(updated);
                                  }}
                                  className={`px-1 py-0.5 text-[8px] font-extrabold rounded ${
                                    (ex.weightUnit || 'kg') === 'kg'
                                      ? 'bg-primary text-black font-black'
                                      : 'bg-white/5 text-gray-500 hover:text-white'
                                  }`}
                                >
                                  KG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formExercises];
                                    updated[exIdx].weightUnit = 'lb';
                                    setFormExercises(updated);
                                  }}
                                  className={`px-1 py-0.5 text-[8px] font-extrabold rounded ${
                                    ex.weightUnit === 'lb'
                                      ? 'bg-primary text-black font-black'
                                      : 'bg-white/5 text-gray-500 hover:text-white'
                                  }`}
                                >
                                  LB
                                </button>
                              </div>
                              <span className="flex-1 max-w-[70px] text-center">REPS</span>
                              <span className="w-8 shrink-0"></span>
                            </div>
                          )}
                          {ex.sets.map((set, setIdx) => (
                            <div key={setIdx} className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                              <span className="text-gray-500 font-semibold w-9 shrink-0">Set {setIdx + 1}</span>
                              <Input
                                type="number"
                                placeholder={ex.weightUnit === 'lb' ? "LB" : "KG"}
                                value={set.weight}
                                onChange={(e) => handleUpdateFormSet(exIdx, setIdx, 'weight', e.target.value)}
                                className="h-8 bg-black/40 text-center flex-1 max-w-[70px] text-xs border-white/10 px-1"
                              />
                              <Input
                                type="number"
                                placeholder="Reps"
                                value={set.reps}
                                onChange={(e) => handleUpdateFormSet(exIdx, setIdx, 'reps', e.target.value)}
                                className="h-8 bg-black/40 text-center flex-1 max-w-[70px] text-xs border-white/10 px-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFormSet(exIdx, setIdx)}
                                className="text-gray-500 hover:text-red-400 ml-auto h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddFormSet(exIdx)}
                            className="text-[10px] text-primary hover:underline font-bold px-1 py-0.5 mt-1 block"
                          >
                            + Serie
                          </button>
                        </div>
                      </div>
                    ))}

                    {formExercises.length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-4">No hay ejercicios en esta sesión.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 mt-2 border-t border-white/5 shrink-0">
                <Button variant="outline" className="w-full sm:flex-1 h-10 text-gray-400 border-white/10 hover:bg-white/5 hover:text-white" onClick={() => setIsManualModalOpen(false)}>
                  Cancelar
                </Button>
                <Button className="w-full sm:flex-1 bg-primary text-black font-bold h-10 hover:bg-primary/90" onClick={handleSaveManual}>
                  Registrar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 3: COMPLETAR AGENDA Y MARCAR COMO REALIZADA */}
      {isCompleteAssignmentModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-[95%] sm:w-full max-w-lg bg-zinc-950 border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" /> Completar Entrenamiento
                  </h3>
                  <p className="text-xs text-gray-400 mt-1"><strong>{selectedAssignment.routines.name}</strong></p>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white rounded-full h-8 w-8" onClick={() => setIsCompleteAssignmentModalOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/10 flex gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Al completar la rutina puedes modificar las series, pesos y repeticiones que hiciste realmente antes de guardar.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase font-heading">Fecha de Ejecución</label>
                  <DatePicker 
                    value={formDate}
                    onChange={setFormDate}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Hora de Inicio</label>
                    <TimePicker 
                      value={formStartTime}
                      onChange={setFormStartTime}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Hora de Fin</label>
                    <TimePicker 
                      value={formEndTime}
                      onChange={setFormEndTime}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Notas y Comentarios (Opcional)</label>
                  <textarea 
                    value={formNotes} 
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ej: Completado a tiempo en el gimnasio."
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none text-white h-16 resize-none"
                  />
                </div>

                {/* Sección de Ejercicios */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase">Ejercicios y Series</label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary text-xs hover:bg-primary/10 h-8"
                      onClick={() => setShowAddExerciseSelector(true)}
                    >
                      + Añadir Ejercicio
                    </Button>
                  </div>

                  <div className="space-y-2.5 pr-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {formExercises.map((ex, exIdx) => (
                      <div key={exIdx} className="bg-black/30 border border-white/5 rounded-lg p-2.5 sm:p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white truncate">{ex.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormExercise(exIdx)}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Series */}
                        <div className="space-y-1.5">
                          {ex.sets.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold px-1 mb-1 select-none">
                              <span className="w-9 shrink-0">SERIE</span>
                              <div className="flex-1 max-w-[70px] flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formExercises];
                                    updated[exIdx].weightUnit = 'kg';
                                    setFormExercises(updated);
                                  }}
                                  className={`px-1 py-0.5 text-[8px] font-extrabold rounded ${
                                    (ex.weightUnit || 'kg') === 'kg'
                                      ? 'bg-primary text-black font-black'
                                      : 'bg-white/5 text-gray-500 hover:text-white'
                                  }`}
                                >
                                  KG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formExercises];
                                    updated[exIdx].weightUnit = 'lb';
                                    setFormExercises(updated);
                                  }}
                                  className={`px-1 py-0.5 text-[8px] font-extrabold rounded ${
                                    ex.weightUnit === 'lb'
                                      ? 'bg-primary text-black font-black'
                                      : 'bg-white/5 text-gray-500 hover:text-white'
                                  }`}
                                >
                                  LB
                                </button>
                              </div>
                              <span className="flex-1 max-w-[70px] text-center">REPS</span>
                              <span className="w-8 shrink-0"></span>
                            </div>
                          )}
                          {ex.sets.map((set, setIdx) => (
                            <div key={setIdx} className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                              <span className="text-gray-500 font-semibold w-9 shrink-0">Set {setIdx + 1}</span>
                              <Input
                                type="number"
                                placeholder={ex.weightUnit === 'lb' ? "LB" : "KG"}
                                value={set.weight}
                                onChange={(e) => handleUpdateFormSet(exIdx, setIdx, 'weight', e.target.value)}
                                className="h-8 bg-black/40 text-center flex-1 max-w-[70px] text-xs border-white/10 px-1"
                              />
                              <Input
                                type="number"
                                placeholder="Reps"
                                value={set.reps}
                                onChange={(e) => handleUpdateFormSet(exIdx, setIdx, 'reps', e.target.value)}
                                className="h-8 bg-black/40 text-center flex-1 max-w-[70px] text-xs border-white/10 px-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveFormSet(exIdx, setIdx)}
                                className="text-gray-500 hover:text-red-400 ml-auto h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddFormSet(exIdx)}
                            className="text-[10px] text-primary hover:underline font-bold px-1 py-0.5 mt-1 block"
                          >
                            + Serie
                          </button>
                        </div>
                      </div>
                    ))}

                    {formExercises.length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-4">No hay ejercicios en esta sesión.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 mt-2 border-t border-white/5 shrink-0">
                <Button variant="outline" className="w-full sm:flex-1 h-10 text-gray-400 border-white/10 hover:bg-white/5 hover:text-white" onClick={() => setIsCompleteAssignmentModalOpen(false)}>
                  Cancelar
                </Button>
                <Button className="w-full sm:flex-1 bg-primary text-black font-bold h-10 hover:bg-primary/90" onClick={handleSaveCompleteAssignment}>
                  Confirmar y Guardar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* NESTED MODAL: AÑADIR EJERCICIO A LA SESIÓN */}
      {showAddExerciseSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-zinc-950 border-white/10 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5 px-4 py-3">
              <CardTitle className="text-sm font-bold text-white">Añadir Ejercicio</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white rounded-full" onClick={() => {
                setShowAddExerciseSelector(false);
                setExerciseSearchTerm('');
              }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Input 
                placeholder="Buscar ejercicio..." 
                value={exerciseSearchTerm}
                onChange={(e) => setExerciseSearchTerm(e.target.value)}
                className="h-9 text-xs bg-black/40 border-white/10"
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                {exercisesCatalog
                  .filter(ex => ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()))
                  .map(ex => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleAddFormExercise(ex)}
                      className="w-full text-left p-2 rounded text-xs text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/10"
                    >
                      {ex.name}
                    </button>
                  ))
                }
                {exercisesCatalog.filter(ex => ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase())).length === 0 && (
                  <p className="text-xs text-gray-500 italic text-center py-4">No se encontraron resultados.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
