import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X, Search, Dumbbell, Layers, Cpu, Settings, ScrollText, User, ArrowUpDown } from 'lucide-react';
import { RoutineManagement } from './RoutineManagement';
import { StudentManagement } from './StudentManagement';
import { CatalogList } from './CatalogList';
import { FormSelect } from '@/components/FormSelect';

export function ManagementDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'routines' | 'exercises' | 'muscle_groups' | 'machines'>('students');
  const [loading, setLoading] = useState(true);
  
  const [exercises, setExercises] = useState<any[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros y ordenamiento de ejercicios
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'muscle_group' | 'machine'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
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

  const getProcessedExercises = () => {
    let list = [...exercises];

    // 1. Filtrar por término de búsqueda (nombre, grupo muscular o máquina)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(ex => 
        ex.name.toLowerCase().includes(term) ||
        ex.muscle_groups?.name?.toLowerCase().includes(term) ||
        ex.machines?.name?.toLowerCase().includes(term)
      );
    }

    // 2. Filtrar por grupo muscular
    if (muscleGroupFilter) {
      list = list.filter(ex => ex.muscle_group_id === muscleGroupFilter);
    }

    // 3. Filtrar por máquina
    if (machineFilter) {
      list = list.filter(ex => ex.machine_id === machineFilter);
    }

    // 4. Ordenamiento
    list.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortBy === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      } else if (sortBy === 'muscle_group') {
        valA = a.muscle_groups?.name || '';
        valB = b.muscle_groups?.name || '';
      } else if (sortBy === 'machine') {
        valA = a.machines?.name || '';
        valB = b.machines?.name || '';
      }

      const comparison = valA.localeCompare(valB, 'es', { sensitivity: 'base' });
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  };

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
                    <FormSelect
                      value={selectedMuscleGroupId || "none"}
                      onValueChange={(val) => setSelectedMuscleGroupId(val === "none" ? "" : val)}
                      options={[
                        { value: "none", label: "Seleccionar..." },
                        ...muscleGroups.map(mg => ({ value: mg.id, label: mg.name }))
                      ]}
                      placeholder="Seleccionar..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Máquina (Opcional)</label>
                    <FormSelect
                      value={selectedMachineId || "none"}
                      onValueChange={(val) => setSelectedMachineId(val === "none" ? "" : val)}
                      options={[
                        { value: "none", label: "Ninguna / Peso Libre" },
                        ...machines.map(m => ({ value: m.id, label: m.name }))
                      ]}
                      placeholder="Ninguna / Peso Libre"
                    />
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
              {activeTab === 'exercises' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-white/5 border border-white/5 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Grupo Muscular</label>
                    <FormSelect
                      value={muscleGroupFilter || "all"}
                      onValueChange={(val) => setMuscleGroupFilter(val === "all" ? "" : val)}
                      options={[
                        { value: "all", label: "Todos" },
                        ...muscleGroups.map(mg => ({ value: mg.id, label: mg.name }))
                      ]}
                      placeholder="Todos"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Máquina</label>
                    <FormSelect
                      value={machineFilter || "all"}
                      onValueChange={(val) => setMachineFilter(val === "all" ? "" : val)}
                      options={[
                        { value: "all", label: "Todas" },
                        ...machines.map(m => ({ value: m.id, label: m.name }))
                      ]}
                      placeholder="Todas"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Ordenar por</label>
                    <FormSelect
                      value={sortBy}
                      onValueChange={(val) => setSortBy(val as any)}
                      options={[
                        { value: "name", label: "Nombre" },
                        { value: "muscle_group", label: "Grupo Muscular" },
                        { value: "machine", label: "Máquina" }
                      ]}
                      placeholder="Ordenar por"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Dirección</label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-9 bg-black/40 border-white/10 text-xs flex justify-between items-center text-gray-300 hover:text-white"
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                      <span>{sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}</span>
                      <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </div>
                </div>
              )}

              <CatalogList
                items={
                  activeTab === 'exercises' 
                    ? getProcessedExercises()
                    : activeTab === 'muscle_groups' 
                      ? muscleGroups 
                      : machines
                }
                searchTerm={activeTab === 'exercises' ? '' : searchTerm}
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
