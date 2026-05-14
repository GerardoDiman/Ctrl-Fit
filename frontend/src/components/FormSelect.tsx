import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  label?: string;
}

export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecciona una opción",
  className = "",
  label,
}: FormSelectProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onValueChange} modal={false}>
        <SelectTrigger className="w-full bg-gray-800/50 border-gray-700 text-gray-100 focus:ring-[var(--color-primary)]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent 
          position="popper" 
          sideOffset={4}
          className="bg-gray-900 border-gray-800 text-gray-100 z-[100] w-[var(--radix-select-trigger-width)]"
        >
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="focus:bg-primary data-[highlighted]:bg-primary !focus:text-black !data-[highlighted]:text-black focus:**:!text-black data-[highlighted]:**:!text-black cursor-pointer"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
