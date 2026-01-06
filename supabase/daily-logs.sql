-- Table: daily_logs
-- Description: Suivi quotidien des symptômes et de l'humeur

DROP TABLE IF EXISTS daily_logs CASCADE;

CREATE TABLE daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Date du log
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Humeur générale (1-5)
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  
  -- Niveau d'énergie (1-5)
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  
  -- Qualité du sommeil (1-5)
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  
  -- Symptômes physiques (intensité 0-3: none/mild/moderate/severe)
  hot_flashes INTEGER CHECK (hot_flashes >= 0 AND hot_flashes <= 3) DEFAULT 0,
  night_sweats INTEGER CHECK (night_sweats >= 0 AND night_sweats <= 3) DEFAULT 0,
  headaches INTEGER CHECK (headaches >= 0 AND headaches <= 3) DEFAULT 0,
  joint_pain INTEGER CHECK (joint_pain >= 0 AND joint_pain <= 3) DEFAULT 0,
  fatigue INTEGER CHECK (fatigue >= 0 AND fatigue <= 3) DEFAULT 0,
  
  -- Symptômes mentaux/émotionnels (intensité 0-3)
  anxiety INTEGER CHECK (anxiety >= 0 AND anxiety <= 3) DEFAULT 0,
  irritability INTEGER CHECK (irritability >= 0 AND irritability <= 3) DEFAULT 0,
  brain_fog INTEGER CHECK (brain_fog >= 0 AND brain_fog <= 3) DEFAULT 0,
  low_mood INTEGER CHECK (low_mood >= 0 AND low_mood <= 3) DEFAULT 0,
  
  -- Notes/Journal (optionnel)
  notes TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte : un seul log par jour et par utilisateur
  UNIQUE(user_id, log_date)
);

-- Enable Row Level Security
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisatrices peuvent voir leurs propres logs
CREATE POLICY "Users can view own daily logs" 
  ON daily_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Les utilisatrices peuvent créer leurs propres logs
CREATE POLICY "Users can insert own daily logs" 
  ON daily_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisatrices peuvent modifier leurs propres logs
CREATE POLICY "Users can update own daily logs" 
  ON daily_logs FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisatrices peuvent supprimer leurs propres logs
CREATE POLICY "Users can delete own daily logs" 
  ON daily_logs FOR DELETE 
  USING (auth.uid() = user_id);

-- Function: Mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON daily_logs;
CREATE TRIGGER update_daily_logs_updated_at 
  BEFORE UPDATE ON daily_logs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(log_date DESC);
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date DESC);
