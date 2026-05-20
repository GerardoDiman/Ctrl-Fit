import { Dumbbell, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

export function Navbar() {
  const { session, profile, loading, signOut } = useAuth();

  return (
    <nav className="w-full z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-white hover:text-[var(--color-primary)] transition-colors">
          <Dumbbell className="h-6 w-6 text-[var(--color-primary)]" />
          <span className="font-heading font-bold text-xl tracking-tight">CTRL+FIT</span>
        </a>

        {/* Links principales */}
        <div className="flex items-center gap-6">
          {session && (
            <>
              <a href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <Dumbbell className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </a>
              {(profile?.role === 'trainer' || profile?.role === 'owner') && (
                <a href="/dashboard/management" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Gestión</span>
                </a>
              )}
              <a href="/dashboard/profile" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </a>
            </>
          )}
          
          {loading ? (
             <div className="w-24 h-9 bg-[var(--color-surface)] animate-pulse rounded-sm"></div>
          ) : session ? (
            <button onClick={signOut} className="flex items-center gap-2 text-sm font-medium bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </button>
          ) : (
            <a href="/auth" className="flex items-center gap-2 text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 rounded-sm text-white hover:border-[var(--color-primary)] transition-colors">
              <User className="h-4 w-4" />
              <span>Ingresar</span>
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
