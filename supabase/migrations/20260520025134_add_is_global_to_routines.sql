-- Agregar columna is_global a la tabla routines
ALTER TABLE public.routines ADD COLUMN is_global BOOLEAN DEFAULT false;

-- Actualizar política de visibilidad (SELECT) de rutinas
DROP POLICY IF EXISTS "Routines visibility" ON public.routines;

CREATE POLICY "Routines visibility" ON public.routines FOR SELECT USING (
  student_id = auth.uid() OR 
  (student_id IS NULL AND (is_global = true OR trainer_id = auth.uid())) OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer'))
);

-- Actualizar política de modificación (INSERT/UPDATE/DELETE) de rutinas
DROP POLICY IF EXISTS "Trainers and Owners manage routines" ON public.routines;

CREATE POLICY "Manage routines" ON public.routines FOR ALL USING (
  -- Los owners pueden hacer cualquier operación
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner') OR
  -- Los entrenadores pueden gestionar solo sus propias rutinas locales
  (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'trainer') 
   AND trainer_id = auth.uid() 
   AND is_global = false)
);
