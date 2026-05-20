import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X, Search, Dumbbell, Layers, Cpu, Settings, ScrollText, User } from 'lucide-react';
import { RoutineManagement } from './RoutineManagement';
import { StudentManagement } from './StudentManagement';
import { CatalogList } from './CatalogList';

export function ManagementDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'routines' | 'exercises' | 'muscle_groups' | 'machines'>('students');
  const [loading, setLoading] = useState(true);
  
  const [exercises, setExercises] = useState<any[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for new items
  const [newItemName, setNewItemName] = useState('');
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  
  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [exRes, mgRes, mRes] = await Promise.all([
      supabase.from('exercises').select('*, muscle_groups(name), machines(name)').order('name'),
      supabase.from('muscle_groups').select('*').order('name'),
      supabase.from('machines').select('*').order('name')
    ]);
    
    if (exRes.data) setExercises(exRes.data);
    if (mgRes.data) setMuscleGroups(mgRes.data);
    if (mRes.data) setMachines(mRes.data);
    setLoading(false);
  };

  const handleAddExercise = async () => {
    if (!newItemName.trim()) return;
    const { data, error } = await supabase.from('exercises').insert({
      name: newItemName,
      muscle_group_id: selectedMuscleGroupId || null,
      machine_id: selectedMachineId || null
    }).select().single();
    
    if (!error && data) {
      setExercises([...exercises, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
      fetchData(); // Refetch to get names of relations
    }
  };

  const handleAddMuscleGroup = async () => {
    if (!newItemName.trim()) return;
    const { data, error } = await supabase.from('muscle_groups').insert({ name: newItemName }).select().single();
    if (!error && data) {
      setMuscleGroups([...muscleGroups, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
    }
  };

  const handleAddMachine = async () => {
    if (!newItemName.trim()) return;
    const { data, error } = await supabase.from('machines').insert({ name: newItemName }).select().single();
    if (!error && data) {
      setMachines([...machines, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      if (table === 'exercises') setExercises(exercises.filter(x => x.id !== id));
      if (table === 'muscle_groups') setMuscleGroups(muscleGroups.filter(x => x.id !== id));
      if (table === 'machines') setMachines(machines.filter(x => x.id !== id));
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ex.muscle_groups?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-400 animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

  if (!profile || (profile.role !== 'trainer' && profile.role !== 'owner')) {
    return (
      <Card className="bg-red-500/5 border-red-500/20 max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <X className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acceso Denegado</h2>
          <p className="text-gray-400 mb-6">No tienes los permisos necesarios para acceder a esta sección.</p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Volver al Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar pb-1 md:pb-0">
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5 min-w-[540px] md:min-w-0 w-full max-w-2xl mx-auto gap-1">
          {[
            { id: 'students', label: 'Alumnos', icon: User },
            { id: 'routines', label: 'Rutinas', icon: ScrollText },
            { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
            { id: 'muscle_groups', label: 'Músculos', icon: Layers },
            { id: 'machines', label: 'Máquinas', icon: Cpu },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setNewItemName('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-medium transition-all rounded-md whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'students' ? (
        <StudentManagement />
      ) : activeTab === 'routines' ? (
        <RoutineManagement />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Izquierdo: Crear */}
          <Card className="bg-zinc-950 border-white/5 lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Nuevo {activeTab === 'exercises' ? 'Ejercicio' : activeTab === 'muscle_groups' ? 'Grupo Muscular' : 'Máquina'}</CardTitle>
              <CardDescription>Completa los campos para añadir al catálogo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                <Input 
                  placeholder="Ej: Press Militar" 
                  value={newItemName} 
                  onChange={(e) => setNewItemName(e.target.value)} 
                />
              </div>
              
              {activeTab === 'exercises' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Grupo Muscular</label>
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                      value={selectedMuscleGroupId}
                      onChange={(e) => setSelectedMuscleGroupId(e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {muscleGroups.map(mg => (
                        <option key={mg.id} value={mg.id}>{mg.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Máquina (Opcional)</label>
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                      value={selectedMachineId}
                      onChange={(e) => setSelectedMachineId(e.target.value)}
                    >
                      <option value="">Ninguna / Peso Libre</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <Button 
                className="w-full bg-primary text-black font-bold mt-4" 
                onClick={() => {
                  if (activeTab === 'exercises') handleAddExercise();
                  if (activeTab === 'muscle_groups') handleAddMuscleGroup();
                  if (activeTab === 'machines') handleAddMachine();
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Añadir a Catálogo
              </Button>
            </CardContent>
          </Card>

          {/* Panel Derecho: Lista */}
          <Card className="bg-zinc-950 border-white/5 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Catálogo Actual</CardTitle>
                <CardDescription>Gestiona los elementos existentes.</CardDescription>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input 
                  placeholder="Buscar..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <CatalogList
                items={
                  activeTab === 'exercises' 
                    ? exercises 
                    : activeTab === 'muscle_groups' 
                      ? muscleGroups 
                      : machines
                }
                searchTerm={searchTerm}
                loading={loading}
                onDelete={(id) => handleDelete(activeTab, id)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
