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
    <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
      {filtered.map((item) => (
        <div 
          key={item.id} 
          className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="h-10 w-10 shrink-0 object-cover rounded-lg bg-zinc-900 border border-white/10" 
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-gray-600 select-none">
                <ImageIcon className="h-4.5 w-4.5 text-gray-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-gray-200 truncate">{item.name}</p>
              {renderExtraBadge ? (
                renderExtraBadge(item)
              ) : (
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  {item.muscle_groups?.name && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                      {item.muscle_groups.name}
                    </span>
                  )}
                  {item.machines?.name && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                      {item.machines.name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary/10" 
                onClick={() => onEdit(item)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" 
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
