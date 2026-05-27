-- Añadir columna assignment_id a la tabla workout_sessions
ALTER TABLE public.workout_sessions 
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.routine_assignments(id) ON DELETE SET NULL;
