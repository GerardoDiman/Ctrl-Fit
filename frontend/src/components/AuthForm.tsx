import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dumbbell, Loader2 } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot_password';

export function AuthForm() {
  const [view, setView] = useState<AuthView>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      window.location.href = '/dashboard';
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message.includes('Invalid login credentials') ? 'Correo o contraseña incorrectos.' : error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) throw error;
      setMessage({ type: 'success', text: '¡Registro exitoso! Por favor revisa tu correo electrónico para confirmar tu cuenta y luego inicia sesión.' });
      // Limpiar campos y mandar a login si se desea
      setPassword('');
      setConfirmPassword('');
      // setView('login');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Asumiendo que tendrás una ruta para cambiar la contraseña en el futuro
        redirectTo: window.location.origin + '/auth/update-password',
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Te hemos enviado un correo con instrucciones para restablecer tu contraseña.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  const GoogleButton = () => (
    <Button type="button" variant="secondary" className="w-full mt-4 flex items-center justify-center gap-2 border border-gray-700 bg-gray-900 hover:bg-gray-800" onClick={handleGoogleLogin} disabled={loading}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
      Continuar con Google
    </Button>
  );

  return (
    <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="mb-8 text-center">
        <Dumbbell className="h-12 w-12 text-[var(--color-primary)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold font-heading text-white">Ctrl + Fit</h1>
        <p className="text-gray-400 mt-2">
          {view === 'login' && 'Inicia sesión para continuar en el laboratorio.'}
          {view === 'register' && 'Crea tu cuenta y comienza tu transformación.'}
          {view === 'forgot_password' && 'Recupera el acceso a tu cuenta.'}
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {view === 'login' && 'Iniciar Sesión'}
            {view === 'register' && 'Registrarse'}
            {view === 'forgot_password' && 'Recuperar Contraseña'}
          </CardTitle>
          <CardDescription>
            {view === 'login' && 'Ingresa tu correo y contraseña.'}
            {view === 'register' && 'Completa tus datos para empezar.'}
            {view === 'forgot_password' && 'Ingresa tu correo para recibir las instrucciones.'}
          </CardDescription>
        </CardHeader>
        
        {message && (
          <div className={`mx-6 mb-4 p-3 text-sm rounded-md ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'}`}>
            {message.text}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email-login" className="text-sm font-medium leading-none text-gray-300">Correo Electrónico</label>
                <Input 
                  id="email-login" 
                  type="email" 
                  placeholder="atleta@ctrlfit.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password-login" className="text-sm font-medium leading-none text-gray-300">Contraseña</label>
                  <button type="button" onClick={() => { setView('forgot_password'); setMessage(null); }} className="text-xs text-[var(--color-primary)] hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Input 
                  id="password-login" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingresar
              </Button>
              <GoogleButton />
              <div className="text-sm text-center text-gray-400 mt-4">
                ¿No tienes cuenta? <button type="button" onClick={() => { setView('register'); setMessage(null); }} className="text-[var(--color-primary)] hover:underline font-medium">Regístrate aquí</button>
              </div>
            </CardFooter>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name-register" className="text-sm font-medium leading-none text-gray-300">Nombre Completo</label>
                <Input 
                  id="name-register" 
                  type="text" 
                  placeholder="Arnold Schwarzenegger" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email-register" className="text-sm font-medium leading-none text-gray-300">Correo Electrónico</label>
                <Input 
                  id="email-register" 
                  type="email" 
                  placeholder="atleta@ctrlfit.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password-register" className="text-sm font-medium leading-none text-gray-300">Contraseña</label>
                <Input 
                  id="password-register" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium leading-none text-gray-300">Confirmar Contraseña</label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full" disabled={loading || !email || !password || !name || !confirmPassword}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Cuenta
              </Button>
              <GoogleButton />
              <div className="text-sm text-center text-gray-400 mt-4">
                ¿Ya tienes cuenta? <button type="button" onClick={() => { setView('login'); setMessage(null); }} className="text-[var(--color-primary)] hover:underline font-medium">Inicia sesión</button>
              </div>
            </CardFooter>
          </form>
        )}

        {view === 'forgot_password' && (
          <form onSubmit={handleForgotPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email-forgot" className="text-sm font-medium leading-none text-gray-300">Correo Electrónico</label>
                <Input 
                  id="email-forgot" 
                  type="email" 
                  placeholder="atleta@ctrlfit.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Instrucciones
              </Button>
              <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => { setView('login'); setMessage(null); }} disabled={loading}>
                Volver al inicio de sesión
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
