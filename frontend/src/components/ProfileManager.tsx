import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { ProfileView, type UserProfile } from './ProfileView';

export function ProfileManager() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Iniciando carga de perfil...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Usuario de auth:', user?.id);
      
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      setEmail(user.email || '');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error de base de datos:', error);
        throw error;
      }

      console.log('Datos recibidos de Supabase:', data);

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          height: data.height || '',
          weight: data.weight || '',
          goals: data.goals || '',
          gender: data.gender || '',
          experience_level: data.experience_level || '',
          physical_limitations: data.physical_limitations || '',
        });
      } else {
        // No hay perfil, crear uno vacío
        setProfile({
          full_name: '',
          height: '',
          weight: '',
          goals: '',
          gender: '',
          experience_level: '',
          physical_limitations: '',
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // Ahora todo se gestiona desde ProfileView
  return (
    <ProfileView 
      profile={profile!} 
      email={email} 
      onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)} 
    />
  );
}
