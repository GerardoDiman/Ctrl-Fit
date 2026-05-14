-- Create ENUM for user roles
CREATE TYPE public.user_role AS ENUM ('owner', 'trainer', 'student');

-- Profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role public.user_role NOT NULL DEFAULT 'student',
    first_name TEXT,
    last_name TEXT,
    trainer_id UUID REFERENCES public.profiles(id), -- Para vincular el alumno al entrenador
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grupos Musculares
CREATE TABLE public.muscle_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Máquinas
CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ejercicios
CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    muscle_group_id UUID REFERENCES public.muscle_groups(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL, -- Opcional
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rutinas
CREATE TABLE public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Null si es una plantilla
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ejercicios de la Rutina
CREATE TABLE public.routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 0,
    sets INT NOT NULL,
    reps INT NOT NULL,
    rest_time_seconds INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;

-- Políticas para Perfiles
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Owners can update any profile" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner')
);

-- Políticas para Grupos Musculares, Máquinas y Ejercicios
CREATE POLICY "Gym entities viewable by everyone" ON public.muscle_groups FOR SELECT USING (true);
CREATE POLICY "Gym entities viewable by everyone" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Gym entities viewable by everyone" ON public.exercises FOR SELECT USING (true);

CREATE POLICY "Trainers and Owners manage muscle_groups" ON public.muscle_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer'))
);
CREATE POLICY "Trainers and Owners manage machines" ON public.machines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer'))
);
CREATE POLICY "Trainers and Owners manage exercises" ON public.exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer'))
);

-- Políticas para Rutinas
CREATE POLICY "Routines visibility" ON public.routines FOR SELECT USING (
  student_id = auth.uid() OR student_id IS NULL OR 
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer'))
);

CREATE POLICY "Trainers and Owners manage routines" ON public.routines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer'))
);

-- Políticas para Ejercicios de Rutina
CREATE POLICY "Routine exercises visibility" ON public.routine_exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.routines r
    WHERE r.id = routine_exercises.routine_id 
    AND (r.student_id = auth.uid() OR r.student_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer')))
  )
);

CREATE POLICY "Trainers and Owners manage routine exercises" ON public.routine_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'trainer'))
);

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'student'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
