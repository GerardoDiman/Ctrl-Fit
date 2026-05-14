import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Activity, Dumbbell, Timer, Loader2 } from 'lucide-react';

export const WorkoutStats = () => {
  const [stats, setStats] = useState({
    workoutsCount: 0,
    totalVolume: 0,
    activeTimeMinutes: 0,
    loading: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const now = new Date();
      // Calcular el lunes de la semana actual
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      // 1. Obtener sesiones de la semana
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, start_time, end_time')
        .gte('start_time', start.toISOString())
        .lt('start_time', end.toISOString());

      if (sessionsError) throw sessionsError;

      // 2. Obtener logs para esas sesiones para calcular volumen
      const sessionIds = sessions?.map(s => s.id) || [];
      let totalVolume = 0;
      let activeTimeMinutes = 0;

      if (sessionIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('workout_logs')
          .select('weight, reps')
          .in('session_id', sessionIds);

        if (logsError) throw logsError;

        totalVolume = logs?.reduce((acc, log) => acc + (Number(log.weight || 0) * (log.reps || 0)), 0) || 0;

        // Calcular tiempo activo
        sessions.forEach(s => {
          if (s.start_time && s.end_time) {
            const duration = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
            activeTimeMinutes += Math.floor(duration / (1000 * 60));
          }
        });
      }

      setStats({
        workoutsCount: sessions?.length || 0,
        totalVolume,
        activeTimeMinutes,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching workout stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-pulse">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="hover:border-primary/50 transition-colors duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-heading">Entrenamientos</CardTitle>
          <Dumbbell className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-heading text-white">{stats.workoutsCount}</div>
          <CardDescription>Esta semana</CardDescription>
        </CardContent>
      </Card>
      
      <Card className="hover:border-primary/50 transition-colors duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-heading">Volumen Total</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-heading text-white">
            {stats.totalVolume.toLocaleString()} <span className="text-sm font-normal text-gray-400">kg</span>
          </div>
          <CardDescription>Peso total movido</CardDescription>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/50 transition-colors duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-heading">Tiempo Activo</CardTitle>
          <Timer className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-heading text-white">
            {Math.floor(stats.activeTimeMinutes / 60)}h {stats.activeTimeMinutes % 60}m
          </div>
          <CardDescription>En entrenamiento</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};
