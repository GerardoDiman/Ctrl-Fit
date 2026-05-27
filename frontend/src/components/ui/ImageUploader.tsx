import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './button';
import { showAlert } from '@/lib/customAlert';

interface ImageUploaderProps {
  value: string | null; // URL de la imagen remota existente
  onChange: (file: File | null) => void; // Callback cuando cambia el archivo local
  onRemove?: () => void; // Callback para indicar que se debe limpiar la imagen remota
  className?: string;
}

export function ImageUploader({ value, onChange, onRemove, className = '' }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar estados locales cuando cambia el valor inicial
  useEffect(() => {
    setLocalPreview(null);
    setIsRemoved(false);
  }, [value]);

  const compressAndConvertToWebP = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar proporcionalmente
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas 2d context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              const webpFile = new File([blob], `${nameWithoutExt}.webp`, {
                type: 'image/webp',
                lastModified: Date.now()
              });
              resolve(webpFile);
            } else {
              reject(new Error('Canvas toBlob conversion failed'));
            }
          }, 'image/webp', quality);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setLocalPreview(previewUrl);
        setIsRemoved(false);
        
        try {
          const webpFile = await compressAndConvertToWebP(file);
          onChange(webpFile);
        } catch (err) {
          console.error("Error al convertir a WebP:", err);
          onChange(file); // Fallback si falla
        }
      } else {
        await showAlert("Por favor, selecciona únicamente archivos de imagen.", "Tipo de Archivo Inválido", "warning");
      }
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setLocalPreview(previewUrl);
        setIsRemoved(false);

        try {
          const webpFile = await compressAndConvertToWebP(file);
          onChange(webpFile);
        } catch (err) {
          console.error("Error al convertir a WebP:", err);
          onChange(file);
        }
      } else {
        await showAlert("Por favor, selecciona únicamente archivos de imagen.", "Tipo de Archivo Inválido", "warning");
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    // Si ya había una imagen remota y el usuario la elimina
    if (value) {
      setIsRemoved(true);
      if (onRemove) {
        onRemove();
      }
    }
  };

  // Determinar la imagen a mostrar
  const displayImage = localPreview || (!isRemoved ? value : null);

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {displayImage ? (
        <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-[4/3] w-full flex items-center justify-center">
          <img
            src={displayImage}
            alt="Vista previa"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-bold border-white/20 text-white bg-zinc-950/80 hover:bg-zinc-900"
              onClick={triggerFileInput}
            >
              Cambiar Imagen
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full"
              onClick={handleClear}
              title="Eliminar imagen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerFileInput}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 gap-2 transition-all text-center outline-none ${
            dragActive
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/35'
          }`}
        >
          <div className={`p-3 rounded-full bg-white/5 border border-white/5 transition-transform duration-300 ${dragActive ? 'scale-110 text-primary border-primary/20' : 'text-gray-400'}`}>
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-300 block">Subir imagen de referencia</span>
            <span className="text-[10px] text-gray-500 block mt-0.5">Arrastra y suelta aquí, o haz clic para buscar</span>
          </div>
        </button>
      )}
    </div>
  );
}
