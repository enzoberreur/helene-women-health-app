-- Migration: Ajout de la table hormone_treatment
-- Date: 6 janvier 2026
-- Description: Table pour suivre les traitements hormonaux substitutifs (THS)

CREATE TABLE IF NOT EXISTS hormone_treatment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informations traitement
  treatment_type TEXT NOT NULL CHECK (treatment_type IN (
    'oral_estrogen',           -- Estrogène oral
    'transdermal_patch',       -- Patch transdermique
    'gel',                     -- Gel
    'vaginal_estrogen',        -- Estrogène vaginal
    'combined_continuous',     -- Combiné continu (E+P)
    'combined_sequential',     -- Combiné séquentiel
    'progestogen_only',        -- Progestérone seule
    'tibolone',                -- Tibolone
    'other'                    -- Autre
  )),
  treatment_name TEXT,         -- Nom commercial (ex: "Oestrodose", "Estreva")
  dosage TEXT,                 -- Dosage (ex: "1.5mg", "2 pressions")
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,               -- NULL si traitement en cours
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  
  -- Notes
  prescribing_doctor TEXT,     -- Nom du médecin prescripteur
  notes TEXT,                  -- Notes additionnelles (effets secondaires, ajustements)
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_hormone_treatment_user ON hormone_treatment(user_id);
CREATE INDEX IF NOT EXISTS idx_hormone_treatment_active ON hormone_treatment(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_hormone_treatment_dates ON hormone_treatment(start_date, end_date);

-- RLS (Row Level Security)
ALTER TABLE hormone_treatment ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs ne peuvent voir que leurs propres traitements
CREATE POLICY "Users can view their own treatments"
  ON hormone_treatment
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres traitements
CREATE POLICY "Users can create their own treatments"
  ON hormone_treatment
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres traitements
CREATE POLICY "Users can update their own treatments"
  ON hormone_treatment
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres traitements
CREATE POLICY "Users can delete their own treatments"
  ON hormone_treatment
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_hormone_treatment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hormone_treatment_updated_at
  BEFORE UPDATE ON hormone_treatment
  FOR EACH ROW
  EXECUTE FUNCTION update_hormone_treatment_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE hormone_treatment IS 'Suivi des traitements hormonaux substitutifs (THS)';
COMMENT ON COLUMN hormone_treatment.treatment_type IS 'Type de traitement hormonal (oral, patch, gel, etc.)';
COMMENT ON COLUMN hormone_treatment.treatment_name IS 'Nom commercial du médicament';
COMMENT ON COLUMN hormone_treatment.dosage IS 'Dosage prescrit (ex: 1.5mg, 2 pressions de gel)';
COMMENT ON COLUMN hormone_treatment.start_date IS 'Date de début du traitement';
COMMENT ON COLUMN hormone_treatment.end_date IS 'Date de fin (NULL si en cours)';
COMMENT ON COLUMN hormone_treatment.is_active IS 'Indique si le traitement est actuellement actif';
