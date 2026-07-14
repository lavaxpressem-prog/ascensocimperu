-- ============================================================
-- Migration 00008: Dashboard statistics tables
-- ============================================================

-- Add grade column to profiles if not exists
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Table: user_study_sessions
CREATE TABLE IF NOT EXISTS public.user_study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('banco_preguntas', 'simulador', 'examen', 'audio', 'practica')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: user_exam_results
CREATE TABLE IF NOT EXISTS public.user_exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('simulador', 'examen', 'banco_preguntas', 'practica')),
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: user_question_responses
CREATE TABLE IF NOT EXISTS public.user_question_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_identifier TEXT,
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.user_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started ON public.user_study_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON public.user_exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_completed ON public.user_exam_results(completed_at);
CREATE INDEX IF NOT EXISTS idx_question_responses_user ON public.user_question_responses(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.user_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_responses ENABLE ROW LEVEL SECURITY;

-- user_study_sessions
CREATE POLICY "Users can read own study sessions"
  ON public.user_study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sessions"
  ON public.user_study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sessions"
  ON public.user_study_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all study sessions"
  ON public.user_study_sessions FOR SELECT USING (public.is_admin());

-- user_exam_results
CREATE POLICY "Users can read own exam results"
  ON public.user_exam_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exam results"
  ON public.user_exam_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all exam results"
  ON public.user_exam_results FOR SELECT USING (public.is_admin());

-- user_question_responses
CREATE POLICY "Users can read own question responses"
  ON public.user_question_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own question responses"
  ON public.user_question_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all question responses"
  ON public.user_question_responses FOR SELECT USING (public.is_admin());

-- ============================================================
-- RPC Functions
-- ============================================================

-- Dashboard stats for a single user
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  dias_estudiados bigint,
  horas_estudio numeric,
  ultimo_estudio timestamptz,
  promedio_aprendizaje numeric,
  total_examenes bigint,
  preguntas_respondidas bigint,
  examenes_aprobados bigint,
  simuladores_realizados bigint,
  preguntas_correctas bigint
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(DISTINCT DATE(started_at))
     FROM public.user_study_sessions WHERE user_id = p_user_id) AS dias_estudiados,
    (SELECT COALESCE(ROUND(SUM(duration_seconds) / 3600.0, 1), 0)
     FROM public.user_study_sessions WHERE user_id = p_user_id) AS horas_estudio,
    (SELECT MAX(completed_at)
     FROM public.user_exam_results WHERE user_id = p_user_id) AS ultimo_estudio,
    (SELECT COALESCE(ROUND(AVG(score_percentage), 0), 0)
     FROM public.user_exam_results WHERE user_id = p_user_id) AS promedio_aprendizaje,
    (SELECT COUNT(*) FROM public.user_exam_results WHERE user_id = p_user_id) AS total_examenes,
    (SELECT COUNT(*) FROM public.user_question_responses WHERE user_id = p_user_id) AS preguntas_respondidas,
    (SELECT COUNT(*) FROM public.user_exam_results WHERE user_id = p_user_id AND score_percentage >= 60) AS examenes_aprobados,
    (SELECT COUNT(*) FROM public.user_exam_results WHERE user_id = p_user_id AND exam_type = 'simulador') AS simuladores_realizados,
    (SELECT COUNT(*) FROM public.user_question_responses WHERE user_id = p_user_id AND is_correct = true) AS preguntas_correctas;
$$;

-- Ranking by grade: all approved users ordered by average score
CREATE OR REPLACE FUNCTION public.get_user_ranking_by_grade()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  grade text,
  average_score numeric,
  total_exams bigint,
  total_questions bigint,
  correct_answers bigint
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id AS user_id,
    TRIM(COALESCE(p.name, '') || ' ' || COALESCE(p.apellido_paterno, '') || ' ' || COALESCE(p.apellido_materno, '')) AS full_name,
    COALESCE(NULLIF(p.grade, ''), 'S/N') AS grade,
    COALESCE(ROUND(AVG(e.score_percentage), 0), 0) AS average_score,
    COUNT(e.id) AS total_exams,
    COALESCE(SUM(e.total_questions), 0) AS total_questions,
    COALESCE(SUM(e.correct_answers), 0) AS correct_answers
  FROM public.profiles p
  LEFT JOIN public.user_exam_results e ON e.user_id = p.id
  WHERE p.status = 'approved'
  GROUP BY p.id, p.name, p.apellido_paterno, p.apellido_materno, p.grade
  ORDER BY average_score DESC;
$$;

-- Top performer of the current week
CREATE OR REPLACE FUNCTION public.get_top_performer_of_week()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  grade text,
  average_score numeric,
  total_score numeric,
  exam_count bigint
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id AS user_id,
    TRIM(COALESCE(p.name, '') || ' ' || COALESCE(p.apellido_paterno, '') || ' ' || COALESCE(p.apellido_materno, '')) AS full_name,
    COALESCE(NULLIF(p.grade, ''), 'S/N') AS grade,
    COALESCE(ROUND(AVG(e.score_percentage), 0), 0) AS average_score,
    COALESCE(SUM(e.score_percentage), 0) AS total_score,
    COUNT(e.id) AS exam_count
  FROM public.profiles p
  INNER JOIN public.user_exam_results e ON e.user_id = p.id
  WHERE p.status = 'approved'
    AND e.completed_at >= date_trunc('week', now())
  GROUP BY p.id, p.name, p.apellido_paterno, p.apellido_materno, p.grade
  HAVING COUNT(e.id) > 0
  ORDER BY average_score DESC, total_score DESC
  LIMIT 1;
$$;
