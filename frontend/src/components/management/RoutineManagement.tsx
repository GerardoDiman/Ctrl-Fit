import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Save, X, Search, Dumbbell, ArrowLeft, Loader2, GripVertical, ChevronUp, ChevronDown, Copy } from 'lucide-react';

interface RoutineExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rest_time?: number;
}

interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  exercises_count: number;
  is_global: boolean;
  trainer_id: string;
}

export function RoutineManagement() {
  const { profile } = useAuth();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // List view states
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Editor view states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [routineDescription, setRoutineDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'base'>('personal');
  
  // Exercise selector states
  const [showSelector, setShowSelector] = useState(false);
  const [catalogExercises, setCatalogExercises] = useState<any[]>([]);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id) {
      fetchTemplates();
      fetchCatalog();
      fetchMuscleGroups();
    }
  }, [profile?.id]);

  const fetchMuscleGroups = async () => {
    const { data } = await supabase.from('muscle_groups').select('*').order('name');
    if (data) setMuscleGroups(data);
  };

  const fetchTemplates = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('routines')
      .select(`
        id, 
        name, 
        description,
        is_global,
        trainer_id,
        routine_exercises (id)
      `)
      .is('student_id', null)
      .or(`trainer_id.eq.${profile?.id},is_global.eq.true`)
      .order('name');

    if (!error && data) {
      setTemplates(data.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        exercises_count: r.routine_exercises?.length || 0,
        is_global: !!r.is_global,
        trainer_id: r.trainer_id
      })));
    }
    setLoading(false);
  };

  const fetchCatalog = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, muscle_group_id')
      .order('name');
    if (data) setCatalogExercises(data);
  };

  const handleEdit = async (template: RoutineTemplate) => {
    setLoading(true);
    setEditingId(template.id);
    setRoutineName(template.name);
    setRoutineDescription(template.description);
    setIsGlobal(template.is_global);
    
    const { data, error } = await supabase
      .from('routine_exercises')
      .select('*, exercises(name)')
      .eq('routine_id', template.id)
      .order('order_index');

    if (!error && data) {
      setSelectedExercises(data.map(re => ({
        id: re.exercise_id,
        name: re.exercises.name,
        sets: re.sets,
        reps: re.reps,
        weight: re.weight
      })));
    }
    
    setLoading(false);
    setView('editor');
  };

  const handleCreate = () => {
    setEditingId(null);
    setRoutineName('');
    setRoutineDescription('');
    setSelectedExercises([]);
    setIsGlobal(false);
    setView('editor');
  };

  const handleDuplicate = async (template: RoutineTemplate) => {
    setLoading(true);
    setEditingId(null); // It's a new routine
    setRoutineName(`${template.name} (Copia)`);
    setRoutineDescription(template.description);
    setIsGlobal(false); // Las rutinas duplicadas son locales por defecto
    
    const { data, error } = await supabase
      .from('routine_exercises')
      .select('*, exercises(name)')
      .eq('routine_id', template.id)
      .order('order_index');

    if (!error && data) {
      setSelectedExercises(data.map(re => ({
        id: re.exercise_id,
        name: re.exercises.name,
        sets: re.sets,
        reps: re.reps,
        weight: re.weight
      })));
    }
    
    setLoading(false);
    setView('editor');
  };

  const handleSave = async () => {
    if (!routineName.trim()) {
      alert('La rutina necesita un nombre.');
      return;
    }
    if (selectedExercises.length === 0) {
      alert('Añade al menos un ejercicio.');
      return;
    }

    setSaving(true);
    try {
      let routineId = editingId;

      const isOwner = profile?.role === 'owner';

      if (editingId) {
        // Update
        const updatePayload: any = {
          name: routineName,
          description: routineDescription
        };
        if (isOwner) {
          updatePayload.is_global = isGlobal;
        }
        await supabase.from('routines').update(updatePayload).eq('id', editingId);
        
        // Clean exercises to re-insert
        await supabase.from('routine_exercises').delete().eq('routine_id', editingId);
      } else {
        // Create
        const insertPayload: any = {
          name: routineName,
          description: routineDescription,
          trainer_id: profile?.id,
          student_id: null
        };
        if (isOwner) {
          insertPayload.is_global = isGlobal;
        }
        const { data, error } = await supabase.from('routines').insert(insertPayload).select().single();
        
        if (error) throw error;
        routineId = data.id;
      }

      // Insert exercises
      const routineEx = selectedExercises.map((ex, idx) => ({
        routine_id: routineId,
        exercise_id: ex.id,
        order_index: idx,
        sets: parseInt(ex.sets) || 0,
        reps: parseInt(ex.reps) || 0,
        weight: parseFloat(ex.weight) || 0
      }));

      await supabase.from('routine_exercises').insert(routineEx);
      
      setView('list');
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la rutina.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta rutina prefabricada?')) return;
    
    await supabase.from('routine_exercises').delete().eq('routine_id', id);
    const { error } = await supabase.from('routines').delete().eq('id', id);
    
    if (!error) fetchTemplates();
  };

  const addExercise = (ex: any) => {
    setSelectedExercises([...selectedExercises, {
      id: ex.id,
      name: ex.name,
      sets: 3,
      reps: 12,
      weight: 0
    }]);
    setShowSelector(false);
  };

  const updateExercise = (idx: number, field: string, value: any) => {
    const updated = [...selectedExercises];
    updated[idx] = { ...updated[idx], [field]: value };
    setSelectedExercises(updated);
  };

  const removeExercise = (idx: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== idx));
  };

  const moveExercise = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= selectedExercises.length) return;
    
    const updated = [...selectedExercises];
    const [moved] = updated.splice(idx, 1);
    updated.splice(newIdx, 0, moved);
    setSelectedExercises(updated);
  };

  if (view === 'editor') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setView('list')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => setView('list')}>Cancelar</Button>
             <Button onClick={handleSave} disabled={saving} className="bg-primary text-black font-bold">
               {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
               Guardar Plantilla
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 bg-zinc-950 border-white/5">
            <CardHeader>
              <CardTitle>Detalles de la Rutina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                <Input 
                  placeholder="Ej: Empuje (Push) A" 
                  value={routineName} 
                  onChange={(e) => setRoutineName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Descripción (Opcional)</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 rounded-md p-3 text-sm focus:ring-1 focus:ring-primary outline-none min-h-[100px]"
                  placeholder="Ej: Rutina enfocada en fuerza de pecho y hombros."
                  value={routineDescription}
                  onChange={(e) => setRoutineDescription(e.target.value)}
                />
              </div>
              {profile?.role === 'owner' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 mt-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-gray-200">Plantilla Global</span>
                    <span className="text-[10px] text-gray-400">Pública para todos los entrenadores</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGlobal(!isGlobal)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isGlobal ? 'bg-primary' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        isGlobal ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-zinc-950 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ejercicios</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowSelector(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Añadir
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedExercises.map((ex, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-sm">{ex.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col gap-0.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-500 hover:text-primary disabled:opacity-30" 
                            onClick={() => moveExercise(idx, 'up')}
                            disabled={idx === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-500 hover:text-primary disabled:opacity-30" 
                            onClick={() => moveExercise(idx, 'down')}
                            disabled={idx === selectedExercises.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => removeExercise(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Series</label>
                        <Input type="number" value={ex.sets} onChange={(e) => updateExercise(idx, 'sets', e.target.value)} className="h-8 text-center bg-black/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Reps</label>
                        <Input type="number" value={ex.reps} onChange={(e) => updateExercise(idx, 'reps', e.target.value)} className="h-8 text-center bg-black/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Peso Ref (kg)</label>
                        <Input type="number" value={ex.weight} onChange={(e) => updateExercise(idx, 'weight', e.target.value)} className="h-8 text-center bg-black/50" />
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedExercises.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl text-gray-500 italic">
                    No has añadido ejercicios a esta plantilla.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {showSelector && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <Card className="w-full max-w-md bg-zinc-950 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Seleccionar Ejercicio</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowSelector(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <Input 
                  placeholder="Buscar..." 
                  value={selectorSearch} 
                  onChange={(e) => setSelectorSearch(e.target.value)}
                  className="mt-4"
                />
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  {catalogExercises
                    .filter(ex => ex.name.toLowerCase().includes(selectorSearch.toLowerCase()))
                    .map(ex => {
                      const muscleGroup = muscleGroups.find(mg => mg.id === ex.muscle_group_id);
                      return (
                        <button
                          key={ex.id}
                          onClick={() => addExercise(ex)}
                          className="w-full text-left p-3 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium border border-transparent hover:border-primary/20 flex justify-between items-center group/btn"
                        >
                          <span>{ex.name}</span>
                          {muscleGroup && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-gray-400 group-hover/btn:bg-primary/20 group-hover/btn:text-primary">
                              {muscleGroup.name}
                            </span>
                          )}
                        </button>
                      );
                    })
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'personal') {
      return matchesSearch && !t.is_global;
    } else {
      return matchesSearch && t.is_global;
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg border border-white/5 self-start">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-sm text-xs font-bold transition-all ${
              activeTab === 'personal'
                ? 'bg-primary text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mis Plantillas
          </button>
          <button
            onClick={() => setActiveTab('base')}
            className={`px-4 py-2 rounded-sm text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'base'
                ? 'bg-primary text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Rutinas Base
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold transition-all ${
              activeTab === 'base'
                ? 'bg-black/20 text-black'
                : 'bg-[#adc6ff]/10 text-[#adc6ff]'
            }`}>
              {templates.filter(t => t.is_global).length}
            </span>
          </button>
        </div>
        <Button onClick={handleCreate} className="bg-primary text-black font-bold">
          <Plus className="h-4 w-4 mr-2" /> Nueva Plantilla
        </Button>
      </div>

      <Card className="bg-zinc-950 border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar plantilla..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full py-12 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
              </div>
            ) : filteredTemplates.map(template => (
              <Card key={template.id} className="bg-white/5 border-white/5 hover:border-primary/30 transition-all group overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                        {template.name}
                        {template.is_global && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20 font-bold uppercase tracking-wider">
                            Base
                          </span>
                        )}
                      </h3>
                    </div>
                     <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" title="Duplicar" onClick={() => handleDuplicate(template)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {(!template.is_global || profile?.role === 'owner') && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" title="Editar" onClick={() => handleEdit(template)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/20 text-red-400" title="Eliminar" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{template.description || 'Sin descripción'}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase">
                    <Dumbbell className="h-3 w-3" />
                    {template.exercises_count} Ejercicios
                  </div>
                </div>
              </Card>
            ))}
            
            {!loading && filteredTemplates.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <Dumbbell className="h-12 w-12 text-white/5 mx-auto mb-4" />
                <p className="text-gray-500 italic">
                  {activeTab === 'personal' 
                    ? 'No has creado ninguna plantilla de rutina aún.' 
                    : 'No hay rutinas base de la plataforma registradas.'}
                </p>
                {activeTab === 'personal' && (
                  <Button variant="link" onClick={handleCreate} className="text-primary mt-2">Crear mi primera rutina</Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
