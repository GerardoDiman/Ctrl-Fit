import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
  step?: number | string;
}

/**
 * Un input de tipo número con controles de incremento/decremento personalizados
 * para mantener la estética premium de la plataforma.
 */
export function NumberInput({ className, value, onValueChange, step = 1, ...props }: NumberInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.stepUp();
      // Disparar el evento de cambio manualmente
      const event = new Event('input', { bubbles: true });
      inputRef.current.dispatchEvent(event);
      if (onValueChange) onValueChange(inputRef.current.value);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.stepDown();
      // Disparar el evento de cambio manualmente
      const event = new Event('input', { bubbles: true });
      inputRef.current.dispatchEvent(event);
      if (onValueChange) onValueChange(inputRef.current.value);
    }
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <Input
        ref={inputRef}
        type="number"
        value={value}
        className="pr-10 h-10" // Espacio para los botones
        onChange={(e) => {
          if (props.onChange) props.onChange(e);
          if (onValueChange) onValueChange(e.target.value);
        }}
        step={step}
        {...props}
      />
      <div className="absolute right-0 h-full flex flex-col border-l border-gray-800 bg-gray-900/50 rounded-r-sm overflow-hidden w-8">
        <button
          type="button"
          onClick={handleIncrement}
          className="flex-1 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-black transition-all border-b border-gray-800/50 text-gray-400"
          tabIndex={-1}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          className="flex-1 flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-black transition-all text-gray-400"
          tabIndex={-1}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
