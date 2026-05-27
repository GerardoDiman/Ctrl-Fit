import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Dumbbell, Edit2, Trash2, Plus } from 'lucide-react';
import { showAlert, showConfirm } from '@/lib/customAlert';

export const RoutineList = () => {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutines = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('routines')
      .select(`
        id,
        name,
        description,
        created_at,
        routine_exercises (
          id
        )
      `)
      .eq('student_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRoutines(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (await showConfirm(`¿Estás seguro de que deseas eliminar la rutina "${name}"? Esta acción no se puede deshacer.`, 'Eliminar Rutina', 'danger', 'ELIMINAR', 'CANCELAR')) {
      try {
        // First delete exercises
        await supabase.from('routine_exercises').delete().eq('routine_id', id);
        // Then delete routine
        const { error } = await supabase.from('routines').delete().eq('id', id);
        
        if (error) throw error;
        
        // Refresh list
        setRoutines(routines.filter(r => r.id !== id));
      } catch (error: any) {
        await showAlert('Error al eliminar la rutina: ' + error.message, 'Error', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border-primary/20 bg-card/50 flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-heading border-b border-[var(--color-border)] pb-2 flex-1">Mis Rutinas</h2>
        <a 
          href="/dashboard/workout?edit=true" 
          className="ml-4 flex items-center gap-2 bg-primary/10 text-primary border border-primary/50 px-4 py-2 rounded-sm text-sm font-semibold hover:bg-primary/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          Nueva Rutina
        </a>
      </div>

      {routines.length === 0 ? (
        <Card className="border-dashed border-primary/30 bg-card/20 text-center p-12">
          <Dumbbell className="h-12 w-12 text-primary/20 mx-auto mb-4" />
          <CardTitle className="text-gray-400 mb-2">Sin Rutinas Programadas</CardTitle>
          <p className="text-gray-500 mb-6">Comienza creando tu primer plan de entrenamiento personalizado.</p>
          <a 
            href="/dashboard/workout?edit=true" 
            className="inline-flex items-center gap-2 bg-primary text-black px-6 py-3 rounded-sm font-bold hover:bg-primary/90 transition-all"
          >
            Crear Mi Primera Rutina
          </a>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {routines.map((routine) => (
            <Card key={routine.id} className="border-primary/30 bg-card hover:border-primary/50 transition-all shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.05)] flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{routine.name}</CardTitle>
                    <CardDescription>
                      {routine.description || 'Programa Personalizado'}
                    </CardDescription>
                  </div>
                  <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-500 uppercase tracking-wider">
                    {new Date(routine.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-4">
                <p className="text-gray-400 text-sm mb-6 flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  {routine.routine_exercises?.length || 0} Ejercicios • 45 - 60 min
                </p>
                
                <div className="grid grid-cols-4 gap-2">
                  <a 
                    href={`/dashboard/workout?routineId=${routine.id}`} 
                    className="col-span-2 flex items-center justify-center gap-2 bg-primary text-black text-xs font-bold rounded-sm py-3 hover:bg-primary/90 transition-all"
                  >
                    <Dumbbell className="h-3 w-3" />
                    PREPARAR
                  </a>
                  <a 
                    href={`/dashboard/workout?routineId=${routine.id}&edit=true`} 
                    className="flex items-center justify-center bg-white/5 text-gray-300 border border-white/10 rounded-sm py-3 hover:bg-white/10 transition-all"
                    title="Editar Rutina"
                  >
                    <Edit2 className="h-3 w-3" />
                  </a>
                  <button 
                    onClick={() => handleDelete(routine.id, routine.name)}
                    className="flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 rounded-sm py-3 hover:bg-red-500/20 transition-all"
                    title="Eliminar Rutina"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
