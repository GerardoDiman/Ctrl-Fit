import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Dumbbell } from 'lucide-react';

export const NextWorkout = () => {
  const [routine, setRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutine = async () => {
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
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setRoutine(data);
      }
      setLoading(false);
    };

    fetchRoutine();
  }, []);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-card/50 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (!routine) {
    return (
      <Card className="border-dashed border-primary/30 bg-card/20">
        <CardHeader>
          <CardTitle className="text-gray-400">Sin Entrenamientos Programados</CardTitle>
          <CardDescription>Aún no has creado una rutina para hoy.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/dashboard/workout" className="block w-full bg-primary/10 text-primary border border-primary/50 text-center font-semibold rounded-sm py-3 hover:bg-primary/20 transition-colors">
            Programar Primer Entrenamiento
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50 bg-card shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]">
      <CardHeader>
        <CardTitle className="text-2xl">{routine.name}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          {routine.description || 'Programa Personalizado'}
          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500">
            {new Date(routine.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 mb-4 flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />
          {routine.routine_exercises?.length || 0} Ejercicios • 45 - 60 minutos
        </p>
        <a href={`/dashboard/workout?routineId=${routine.id}`} className="block w-full bg-primary text-black text-center font-bold rounded-sm py-4 hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-lg">
          Iniciar Entrenamiento
        </a>
      </CardContent>
    </Card>
  );
};
