-- Añadir columna de unidad de peso a routine_exercises
ALTER TABLE public.routine_exercises ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg';

-- Añadir columna de unidad de peso a workout_logs
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg';

-- Añadir restricciones CHECK
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_routine_exercise_weight_unit') THEN
    ALTER TABLE public.routine_exercises ADD CONSTRAINT check_routine_exercise_weight_unit CHECK (weight_unit IN ('kg', 'lb'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_workout_log_weight_unit') THEN
    ALTER TABLE public.workout_logs ADD CONSTRAINT check_workout_log_weight_unit CHECK (weight_unit IN ('kg', 'lb'));
  END IF;
END $$;
