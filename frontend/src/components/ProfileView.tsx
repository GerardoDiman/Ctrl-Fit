import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCircle, Ruler, Weight, Target, Activity, AlertTriangle, Edit2, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FormSelect } from './FormSelect';
import { NumberInput } from './NumberInput';

export type UserProfile = {
  full_name: string;
  height: string | number;
  weight: string | number;
  goals: string;
  gender: string;
  experience_level: string;
  physical_limitations: string;
};

interface ProfileViewProps {
  profile: UserProfile;
  email?: string;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
}

export function ProfileView({ profile, email, onProfileUpdate }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [editData, setEditData] = useState<UserProfile>(profile);

  // Sincronizar datos locales si el prop profile cambia (ej. primera carga)
  useEffect(() => {
    setEditData(profile);
  }, [profile]);

  const handleEditClick = () => {
    setEditData(profile); // Reset form al abrir modo edición
    setMessage(null);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditData(profile); // Reset form a original
    setMessage(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado.');

      const updates = {
        id: user.id,
        ...editData,
        height: editData.height ? parseFloat(editData.height as string) : null,
        weight: editData.weight ? parseFloat(editData.weight as string) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente.' });
      setIsEditing(false);
      
      if (onProfileUpdate) {
        onProfileUpdate(editData);
      }
      
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {message && (
        <div className={`p-4 text-sm rounded-md ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'}`}>
          {message.text}
        </div>
      )}

      {/* Header Card */}
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20" />
        <CardContent className="pt-0 relative px-6 sm:px-10 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-gray-900 p-2 rounded-full border-4 border-gray-900">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-[var(--color-primary)]">
                  <UserCircle className="w-16 h-16" />
                </div>
              </div>
              <div className="text-center sm:text-left mt-4 sm:mt-0 pb-2 sm:pt-4">
                {isEditing ? (
                  <div className="mb-2">
                    <input 
                      name="full_name"
                      value={editData.full_name}
                      onChange={handleChange}
                      placeholder="Tu nombre completo"
                      autoFocus
                      className="text-3xl font-bold font-heading bg-transparent text-white w-full sm:w-[450px] premium-input-ghost placeholder:text-gray-600"
                    />
                  </div>
                ) : (
                  <h2 className="text-3xl font-bold font-heading text-white">
                    {profile.full_name || 'Usuario sin nombre'}
                  </h2>
                )}
                
                <p className="text-gray-300 mt-2">{email || 'No email disponible'}</p>
                
                {isEditing ? (
                  <div className="mt-2">
                    <FormSelect 
                      value={editData.experience_level}
                      onValueChange={(val) => setEditData(prev => ({ ...prev, experience_level: val }))}
                      options={[
                        { value: "Principiante", label: "Principiante" },
                        { value: "Intermedio", label: "Intermedio" },
                        { value: "Avanzado", label: "Avanzado" },
                      ]}
                      placeholder="Nivel de Experiencia"
                      className="w-48"
                    />
                  </div>
                ) : (
                  profile.experience_level && (
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-medium border border-[var(--color-primary)]/20">
                      {profile.experience_level}
                    </span>
                  )
                )}
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0 mb-2">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleCancelClick} 
                    variant="outline" 
                    size="sm" 
                    disabled={saving}
                    className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} size="sm" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Guardar
                  </Button>
                </>
              ) : (
                <Button onClick={handleEditClick} size="sm">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Métricas Físicas */}
        <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-[var(--color-primary)]" />
              Métricas Físicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800 flex items-start gap-3">
                <Ruler className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" />
                <div className="w-full">
                  <p className="text-sm text-gray-300 font-medium mb-1">Estatura (cm)</p>
                  {isEditing ? (
                    <NumberInput 
                      name="height"
                      value={editData.height}
                      onChange={handleChange}
                      placeholder="Ej. 175"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-lg text-white font-semibold">{profile.height ? `${profile.height} cm` : '--'}</p>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800 flex items-start gap-3">
                <Weight className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" />
                <div className="w-full">
                  <p className="text-sm text-gray-300 font-medium mb-1">Peso (kg)</p>
                  {isEditing ? (
                    <NumberInput 
                      name="weight"
                      step="0.1"
                      value={editData.weight}
                      onChange={handleChange}
                      placeholder="Ej. 70.5"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-lg text-white font-semibold">{profile.weight ? `${profile.weight} kg` : '--'}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-300 font-medium mb-1">Género</p>
              {isEditing ? (
                <FormSelect 
                  value={editData.gender}
                  onValueChange={(val) => setEditData(prev => ({ ...prev, gender: val }))}
                  options={[
                    { value: "Masculino", label: "Masculino" },
                    { value: "Femenino", label: "Femenino" },
                    { value: "Otro", label: "Otro" },
                    { value: "Prefiero no decirlo", label: "Prefiero no decirlo" },
                  ]}
                  placeholder="Selecciona tu género"
                />
              ) : (
                <p className="text-white">{profile.gender || 'No especificado'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entrenamiento y Objetivos */}
        <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-[var(--color-primary)]" />
              Entrenamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-gray-300 font-medium mb-2">Objetivos Principales</p>
              {isEditing ? (
                <Input 
                  name="goals"
                  value={editData.goals}
                  onChange={handleChange}
                  placeholder="Ej. Hipertrofia, Pérdida de peso..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              ) : profile.goals ? (
                <p className="text-white leading-relaxed">{profile.goals}</p>
              ) : (
                <p className="text-gray-500 italic">No se han definido objetivos aún.</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-300 font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Limitaciones Físicas o Médicas
              </p>
              {isEditing ? (
                <textarea 
                  name="physical_limitations"
                  value={editData.physical_limitations}
                  onChange={handleChange}
                  placeholder="Ej. Dolor en rodilla derecha (Opcional)"
                  className="w-full min-h-[80px] rounded-md border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                />
              ) : profile.physical_limitations ? (
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-200 p-3 rounded-lg text-sm">
                  {profile.physical_limitations}
                </div>
              ) : (
                <p className="text-gray-500 italic">Ninguna reportada.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
