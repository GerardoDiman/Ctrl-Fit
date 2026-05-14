import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound } from 'lucide-react';

export function UpdatePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Verificar si el usuario realmente viene de un enlace de recuperación
    // Supabase setea la sesión en la URL (hash) y la procesa automáticamente,
    // pero si no hay sesión, no debería poder cambiar la contraseña.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setMessage({ type: 'error', text: 'Enlace inválido o expirado. Por favor solicita un nuevo enlace de recuperación.' });
      }
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente. Redirigiendo...' });
      
      // Redirigir al dashboard después de un momento
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="mb-8 text-center">
        <KeyRound className="h-12 w-12 text-[var(--color-primary)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold font-heading text-white">Actualizar Contraseña</h1>
        <p className="text-gray-400 mt-2">
          Ingresa tu nueva contraseña para recuperar el acceso.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nueva Contraseña</CardTitle>
          <CardDescription>
            Asegúrate de que tenga al menos 6 caracteres.
          </CardDescription>
        </CardHeader>
        
        {message && (
          <div className={`mx-6 mb-4 p-3 text-sm rounded-md ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium leading-none text-gray-300">Nueva Contraseña</label>
              <Input 
                id="new-password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={message?.type === 'error' && message.text.includes('inválido')}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-new-password" className="text-sm font-medium leading-none text-gray-300">Confirmar Nueva Contraseña</label>
              <Input 
                id="confirm-new-password" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={message?.type === 'error' && message.text.includes('inválido')}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={loading || !password || !confirmPassword || (message?.type === 'error' && message.text.includes('inválido'))}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Contraseña
            </Button>
            <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => window.location.href = '/auth'} disabled={loading}>
              Volver al inicio de sesión
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
