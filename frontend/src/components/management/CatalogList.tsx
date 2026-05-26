import React from 'react';
import { Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CatalogItem {
  id: string;
  name: string;
  image_url?: string | null;
  muscle_group_id?: string | null;
  machine_id?: string | null;
  muscle_groups?: { name: string } | null;
  machines?: { name: string } | null;
}

interface CatalogListProps {
  items: CatalogItem[];
  searchTerm: string;
  loading: boolean;
  onDelete: (id: string) => void;
  onEdit?: (item: CatalogItem) => void;
  renderExtraBadge?: (item: CatalogItem) => React.ReactNode;
}

export function CatalogList({ items, searchTerm, loading, onDelete, onEdit, renderExtraBadge }: CatalogListProps) {
  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 italic">
        No se encontraron elementos.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 max-h-[600px] overflow-y-auto pr-2 pb-6 custom-scrollbar">
      {filtered.map((item) => (
        <div 
          key={item.id} 
          className="relative flex flex-col rounded-xl bg-zinc-900/30 border border-white/5 hover:border-primary/20 hover:bg-zinc-900/60 transition-all group overflow-hidden"
        >
          {/* Botones de Acción Absolutos */}
          <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 bg-black/60 backdrop-blur-sm p-0.5 rounded-lg border border-white/5">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-primary hover:text-black hover:bg-primary rounded-md transition-all" 
                onClick={() => onEdit(item)}
                title="Editar"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-red-400 hover:text-white hover:bg-red-500 rounded-md transition-all" 
              onClick={() => onDelete(item.id)}
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Imagen de Referencia / Placeholder */}
          <div className="w-full aspect-[4/3] shrink-0 bg-zinc-950/80 border-b border-white/5 overflow-hidden flex items-center justify-center relative select-none">
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 text-gray-600">
                <ImageIcon className="h-7 w-7 text-gray-700" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Sin Imagen</span>
              </div>
            )}
          </div>

          {/* Detalles e Información */}
          <div className="p-3 flex flex-col flex-1 min-w-0 justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-200 truncate group-hover:text-white transition-colors" title={item.name}>
                {item.name}
              </p>
            </div>
            {renderExtraBadge ? (
              renderExtraBadge(item)
            ) : (
              <div className="flex gap-1.5 flex-wrap">
                {item.muscle_groups?.name && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider select-none">
                    {item.muscle_groups.name}
                  </span>
                )}
                {item.machines?.name && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider select-none">
                    {item.machines.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
