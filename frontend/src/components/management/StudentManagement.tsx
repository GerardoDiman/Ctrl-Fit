import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Calendar as CalendarIcon, ChevronRight, User, Trash2, ArrowLeft } from 'lucide-react';
import { RoutineCalendar } from './RoutineCalendar';
import { showAlert, showConfirm } from '@/lib/customAlert';

export function StudentManagement() {
  const { user, profile, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchMyStudents();
    }
  }, [user, profile]);

  const fetchMyStudents = async () => {
    if (!user || !profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('trainer_id', user.id)
      .eq('role', 'student')
      .order('full_name');
    
    let list = data || [];
    
    // Crear el registro virtual del entrenador
    const displayName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const selfStudent = {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name: displayName ? `${displayName} (Tú)` : 'Entrenador (Tú)',
      role: profile.role,
      trainer_id: profile.id,
      is_self: true
    };
    
    setStudents([selfStudent, ...list]);
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearchLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(10);
    
    if (data) {
      // Filter out students already assigned to other trainers if necessary
      // For now, allow seeing all but highlight those already linked to me
      setSearchResults(data);
    }
    setSearchLoading(false);
  };

  const linkStudent = async (studentId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ trainer_id: user?.id })
      .eq('id', studentId);
    
    if (!error) {
      fetchMyStudents();
      setSearchResults([]);
      setSearchTerm('');
    } else {
      console.error("Error linking student:", error);
      await showAlert(`No se pudo vincular al estudiante: ${error.message}`, 'Error de Vinculación', 'error');
    }
  };

  const unlinkStudent = async (studentId: string) => {
    if (!await showConfirm('¿Estás seguro de quitar a este estudiante de tu lista?', 'Desvincular Estudiante', 'danger', 'DESVINCULAR', 'CANCELAR')) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ trainer_id: null })
      .eq('id', studentId);
    
    if (!error) {
      fetchMyStudents();
      if (selectedStudent?.id === studentId) setSelectedStudent(null);
    } else {
      console.error("Error unlinking student:", error);
      await showAlert(`No se pudo desvincular al estudiante: ${error.message}`, 'Error de Desvinculación', 'error');
    }
  };

  if (authLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Student List & Search */}
      <div className={`lg:col-span-4 space-y-6 ${selectedStudent ? 'hidden lg:block' : 'block'}`}>
        <Card className="bg-zinc-950 border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Añadir Estudiante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Nombre del alumno..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                {searchResults.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded bg-white/5 text-sm">
                    <span>{s.full_name}</span>
                    {s.trainer_id === user?.id ? (
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">Ya vinculado</span>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => linkStudent(s.id)}>
                        Vincular
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Mis Estudiantes</CardTitle>
            <CardDescription>Selecciona un alumno para gestionar su calendario.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Cargando...</div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-gray-500 italic">No tienes alumnos vinculados.</div>
              ) : (
                students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className={`w-full flex items-center justify-between p-4 transition-colors text-left ${
                      selectedStudent?.id === s.id ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <span className="font-medium text-sm">{s.full_name}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedStudent?.id === s.id ? 'rotate-90 text-primary' : 'text-gray-600'}`} />
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Area: Calendar & Assignment */}
      <div className={`lg:col-span-8 ${!selectedStudent ? 'hidden lg:block' : 'block'}`}>
        {selectedStudent ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden h-10 w-10 text-gray-400 hover:text-white"
                  onClick={() => setSelectedStudent(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedStudent.full_name}</h2>
                  <p className="text-sm text-gray-400">Planificación de entrenamientos</p>
                </div>
              </div>
              {!selectedStudent.is_self && selectedStudent.id !== user?.id && (
                <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10 w-full sm:w-auto" onClick={() => unlinkStudent(selectedStudent.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Desvincular
                </Button>
              )}
            </div>

            <RoutineCalendar studentId={selectedStudent.id} trainerId={user?.id || ''} />
          </div>
        ) : (
          <Card className="bg-zinc-950 border-white/5 h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12">
            <div className="h-20 w-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
              <CalendarIcon className="h-10 w-10 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Selecciona un Estudiante</h3>
            <p className="text-gray-400 max-w-md">
              Elige a uno de tus alumnos de la lista de la izquierda para ver su calendario de rutinas y asignar nuevos entrenamientos.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
