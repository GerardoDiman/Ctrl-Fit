import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CatalogItem {
  id: string;
  name: string;
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
          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-all group"
        >
          <div>
            <p className="font-medium text-sm text-gray-200">{item.name}</p>
            {renderExtraBadge ? (
              renderExtraBadge(item)
            ) : (
              <div className="flex gap-2 mt-1">
                {item.muscle_groups?.name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {item.muscle_groups.name}
                  </span>
                )}
                {item.machines?.name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {item.machines.name}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
