-- Migration: Ajout des colonnes d'analyse de sentiment
-- Date: 6 janvier 2026
-- Description: Ajoute les colonnes pour stocker l'analyse de sentiment des notes du journal

ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS notes_sentiment TEXT CHECK (notes_sentiment IN ('positive', 'negative', 'neutral')),
ADD COLUMN IF NOT EXISTS notes_sentiment_score DECIMAL(3,2) CHECK (notes_sentiment_score BETWEEN -1 AND 1),
ADD COLUMN IF NOT EXISTS notes_sentiment_emoji TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN daily_logs.notes_sentiment IS 'Sentiment analysé des notes: positive, negative, ou neutral';
COMMENT ON COLUMN daily_logs.notes_sentiment_score IS 'Score de sentiment entre -1 (très négatif) et 1 (très positif)';
COMMENT ON COLUMN daily_logs.notes_sentiment_emoji IS 'Emoji représentant le sentiment (😊, 🙂, 😐, 😕, 😢)';

-- Index pour améliorer les performances des requêtes de tendances
CREATE INDEX IF NOT EXISTS idx_daily_logs_sentiment ON daily_logs(notes_sentiment, log_date);
