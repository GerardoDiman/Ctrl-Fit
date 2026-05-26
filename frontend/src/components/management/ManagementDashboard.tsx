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
import { ImageUploader } from '@/components/ui/ImageUploader';

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

  // Image states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setEditingId(null);
    setNewItemName('');
    setSelectedMuscleGroupId('');
    setSelectedMachineId('');
    setSelectedFile(null);
    setExistingImageUrl(null);
    setIsImageRemoved(false);
  }, [activeTab]);

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

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('catalog_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('catalog_images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (e) {
      console.error('Error al subir la imagen:', e);
      alert('Error al subir la imagen al servidor.');
      return null;
    }
  };
  const extractStoragePath = (url: string | null): string | null => {
    if (!url) return null;
    const marker = '/storage/v1/object/public/catalog_images/';
    const index = url.indexOf(marker);
    if (index !== -1) {
      return url.substring(index + marker.length);
    }
    return null;
  };

  const deleteImageFromStorage = async (url: string | null) => {
    if (!url) return;
    try {
      const path = extractStoragePath(url);
      if (path) {
        const { error } = await supabase.storage
          .from('catalog_images')
          .remove([path]);
        if (error) {
          console.error('Error al borrar imagen de Supabase Storage:', error);
        }
      }
    } catch (e) {
      console.error('Excepción al borrar imagen:', e);
    }
  };

  const handleAddExercise = async () => {
    if (!newItemName.trim()) return;
    let uploadedUrl = null;
    if (selectedFile) {
      uploadedUrl = await uploadImage(selectedFile, 'exercises');
    }

    const { data, error } = await supabase.from('exercises').insert({
      name: newItemName.trim(),
      muscle_group_id: selectedMuscleGroupId || null,
      machine_id: selectedMachineId || null,
      image_url: uploadedUrl
    }).select().single();
    
    if (!error && data) {
      setExercises([...exercises, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
      setSelectedFile(null);
      setExistingImageUrl(null);
      setIsImageRemoved(false);
      setUploaderKey(prev => prev + 1);
      fetchData(); // Refetch to get names of relations
    }
  };

  const handleAddMuscleGroup = async () => {
    if (!newItemName.trim()) return;
    let uploadedUrl = null;
    if (selectedFile) {
      uploadedUrl = await uploadImage(selectedFile, 'muscle_groups');
    }

    const { data, error } = await supabase.from('muscle_groups').insert({ 
      name: newItemName.trim(),
      image_url: uploadedUrl
    }).select().single();

    if (!error && data) {
      setMuscleGroups([...muscleGroups, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
      setSelectedFile(null);
      setExistingImageUrl(null);
      setIsImageRemoved(false);
      setUploaderKey(prev => prev + 1);
    }
  };

  const handleAddMachine = async () => {
    if (!newItemName.trim()) return;
    let uploadedUrl = null;
    if (selectedFile) {
      uploadedUrl = await uploadImage(selectedFile, 'machines');
    }

    const { data, error } = await supabase.from('machines').insert({ 
      name: newItemName.trim(),
      image_url: uploadedUrl
    }).select().single();

    if (!error && data) {
      setMachines([...machines, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItemName('');
      setSelectedFile(null);
      setExistingImageUrl(null);
      setIsImageRemoved(false);
      setUploaderKey(prev => prev + 1);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
    
    // 1. Buscar el elemento para capturar la URL antes de eliminar de DB
    let itemToDelete = null;
    if (table === 'exercises') itemToDelete = exercises.find(x => x.id === id);
    if (table === 'muscle_groups') itemToDelete = muscleGroups.find(x => x.id === id);
    if (table === 'machines') itemToDelete = machines.find(x => x.id === id);
    const imageUrl = itemToDelete?.image_url;

    // 2. Eliminar de base de datos
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      // 3. Si tenía imagen, borrarla del Storage físico
      if (imageUrl) {
        await deleteImageFromStorage(imageUrl);
      }

      if (table === 'exercises') setExercises(exercises.filter(x => x.id !== id));
      if (table === 'muscle_groups') setMuscleGroups(muscleGroups.filter(x => x.id !== id));
      if (table === 'machines') setMachines(machines.filter(x => x.id !== id));
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setNewItemName(item.name);
    setExistingImageUrl(item.image_url || null);
    setSelectedFile(null);
    setIsImageRemoved(false);
    if (activeTab === 'exercises') {
      setSelectedMuscleGroupId(item.muscle_group_id || '');
      setSelectedMachineId(item.machine_id || '');
    }
  };

  const handleSaveEdit = async () => {
    if (!newItemName.trim() || !editingId) return;

    let finalImageUrl = existingImageUrl;
    let shouldDeleteOldImage = false;
    const oldImageUrlToDelete = existingImageUrl;

    if (isImageRemoved) {
      finalImageUrl = null;
      shouldDeleteOldImage = true;
    }
    if (selectedFile) {
      const folder = activeTab === 'exercises' ? 'exercises' : activeTab === 'muscle_groups' ? 'muscle_groups' : 'machines';
      const newUrl = await uploadImage(selectedFile, folder);
      if (newUrl) {
        finalImageUrl = newUrl;
        shouldDeleteOldImage = true; // borrar la anterior porque la reemplazamos
      }
    }

    if (activeTab === 'exercises') {
      const { error } = await supabase.from('exercises').update({
        name: newItemName.trim(),
        muscle_group_id: selectedMuscleGroupId || null,
        machine_id: selectedMachineId || null,
        image_url: finalImageUrl
      }).eq('id', editingId);

      if (!error) {
        if (shouldDeleteOldImage && oldImageUrlToDelete) {
          await deleteImageFromStorage(oldImageUrlToDelete);
        }
        setEditingId(null);
        setNewItemName('');
        setSelectedMuscleGroupId('');
        setSelectedMachineId('');
        setSelectedFile(null);
        setExistingImageUrl(null);
        setIsImageRemoved(false);
        setUploaderKey(prev => prev + 1);
        fetchData();
      }
    } else if (activeTab === 'muscle_groups') {
      const { error } = await supabase.from('muscle_groups').update({
        name: newItemName.trim(),
        image_url: finalImageUrl
      }).eq('id', editingId);

      if (!error) {
        if (shouldDeleteOldImage && oldImageUrlToDelete) {
          await deleteImageFromStorage(oldImageUrlToDelete);
        }
        setEditingId(null);
        setNewItemName('');
        setSelectedFile(null);
        setExistingImageUrl(null);
        setIsImageRemoved(false);
        setUploaderKey(prev => prev + 1);
        fetchData();
      }
    } else if (activeTab === 'machines') {
      const { error } = await supabase.from('machines').update({
        name: newItemName.trim(),
        image_url: finalImageUrl
      }).eq('id', editingId);

      if (!error) {
        if (shouldDeleteOldImage && oldImageUrlToDelete) {
          await deleteImageFromStorage(oldImageUrlToDelete);
        }
        setEditingId(null);
        setNewItemName('');
        setSelectedFile(null);
        setExistingImageUrl(null);
        setIsImageRemoved(false);
        setUploaderKey(prev => prev + 1);
        fetchData();
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewItemName('');
    setSelectedMuscleGroupId('');
    setSelectedMachineId('');
    setSelectedFile(null);
    setExistingImageUrl(null);
    setIsImageRemoved(false);
    setUploaderKey(prev => prev + 1);
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
          {/* Panel Izquierdo: Crear / Editar */}
          <Card className="bg-zinc-950 border-white/5 lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">{editingId ? 'Editar' : 'Nuevo'} {activeTab === 'exercises' ? 'Ejercicio' : activeTab === 'muscle_groups' ? 'Grupo Muscular' : 'Máquina'}</CardTitle>
              <CardDescription>{editingId ? 'Modifica los campos del elemento seleccionado.' : 'Completa los campos para añadir al catálogo.'}</CardDescription>
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

              {/* Selector de Imagen de Referencia */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-gray-500 uppercase">Imagen de Referencia</label>
                <ImageUploader
                  key={`${activeTab}-${editingId || 'new'}-${uploaderKey}`}
                  value={existingImageUrl}
                  onChange={(file) => setSelectedFile(file)}
                  onRemove={() => setIsImageRemoved(true)}
                  className="mt-1"
                />
              </div>

              {editingId ? (
                <div className="flex flex-col gap-2 mt-4">
                  <Button 
                    className="w-full bg-primary text-black font-bold" 
                    onClick={handleSaveEdit}
                  >
                    <Check className="mr-2 h-4 w-4" /> Guardar Cambios
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-white/10 text-gray-300 hover:text-white" 
                    onClick={handleCancelEdit}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                </div>
              ) : (
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
              )}
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
                onEdit={handleStartEdit}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
