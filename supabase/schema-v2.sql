-- Table: profiles - Version 2 avec onboarding complet en 6 phases
-- Description: Informations complètes des utilisatrices

DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,

  -- Basic identity (copied from auth.users by trigger)
  email TEXT,
  
  -- Phase 1: Informations de base
  age INTEGER,
  weight DECIMAL(5,2), -- en kg
  height DECIMAL(5,2), -- en cm
  bmi DECIMAL(4,1), -- calculé
  menopause_stage TEXT CHECK (menopause_stage IN ('pre', 'peri', 'meno', 'post')),
  
  -- Phase 2: Historique médical
  uses_contraception BOOLEAN,
  contraception_type TEXT,
  had_hrt BOOLEAN, -- Traitement hormonal substitutif
  hrt_details TEXT,
  menarche_age INTEGER, -- Âge des premières règles
  medical_conditions TEXT[], -- Array de conditions médicales
  other_condition TEXT,
  
  -- Phase 3: Symptômes actuels (échelle MRS 0-3)
  physical_symptoms JSONB DEFAULT '{}', -- {symptom_id: intensity}
  mental_symptoms JSONB DEFAULT '{}',
  cycle_symptoms JSONB DEFAULT '{}',
  
  -- Phase 4: Objectifs
  goals TEXT[], -- Array d'objectifs
  
  -- Phase 5: Préférences
  notification_frequency TEXT CHECK (notification_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  notification_timing TEXT CHECK (notification_timing IN ('morning', 'noon', 'evening')),
  notification_types JSONB DEFAULT '{"symptoms": false, "tips": false, "education": false, "health_alerts": false}',
  medications TEXT,
  supplements TEXT,
  connected_device TEXT,
  sync_data BOOLEAN DEFAULT false,
  
  -- Phase 6: Consentements
  consent_data BOOLEAN DEFAULT false,
  consent_share BOOLEAN DEFAULT false,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisatrices peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Policy: Les utilisatrices peuvent créer leur propre profil
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy: Les utilisatrices peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Les utilisatrices peuvent supprimer leur propre profil
CREATE POLICY "Users can delete own profile" 
  ON profiles FOR DELETE 
  USING (auth.uid() = id);

-- Function: Mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Appliquer la fonction sur update
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_profiles_menopause_stage ON profiles(menopause_stage);
CREATE INDEX idx_profiles_age ON profiles(age);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
