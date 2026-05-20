import React, { useState } from "react";
import { Dumbbell, User, LogOut, Settings, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

export function Navbar() {
  const { session, profile, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="w-full z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-md relative">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-white hover:text-[var(--color-primary)] transition-colors">
          <Dumbbell className="h-6 w-6 text-[var(--color-primary)]" />
          <span className="font-heading font-bold text-xl tracking-tight">CTRL+FIT</span>
        </a>

        {/* Menú de Escritorio */}
        <div className="hidden md:flex items-center gap-6">
          {session && (
            <>
              <a href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <Dumbbell className="h-4 w-4" />
                <span>Dashboard</span>
              </a>
              {(profile?.role === 'trainer' || profile?.role === 'owner') && (
                <a href="/dashboard/management" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  <Settings className="h-4 w-4" />
                  <span>Gestión</span>
                </a>
              )}
              <a href="/dashboard/profile" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <User className="h-4 w-4" />
                <span>Perfil</span>
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

        {/* Disparador de Menú Móvil */}
        <div className="flex md:hidden items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-white/5"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Panel Desplegable Móvil */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-[var(--color-background)] border-b border-[var(--color-border)] p-4 flex flex-col gap-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {session && (
            <div className="flex flex-col gap-3">
              <a 
                href="/dashboard" 
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Dumbbell className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Dashboard</span>
              </a>
              {(profile?.role === 'trainer' || profile?.role === 'owner') && (
                <a 
                  href="/dashboard/management" 
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5 text-[var(--color-primary)]" />
                  <span>Gestión</span>
                </a>
              )}
              <a 
                href="/dashboard/profile" 
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-5 w-5 text-[var(--color-primary)]" />
                <span>Perfil</span>
              </a>
            </div>
          )}
          
          <div className="pt-2 border-t border-[var(--color-border)]">
            {loading ? (
               <div className="w-full h-10 bg-[var(--color-surface)] animate-pulse rounded-sm"></div>
            ) : session ? (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut();
                }} 
                className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-sm text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Salir</span>
              </button>
            ) : (
              <a 
                href="/auth" 
                className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 rounded-sm text-white hover:border-[var(--color-primary)] transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                <span>Ingresar</span>
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
