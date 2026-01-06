/**
 * Analyse de sentiment simple basée sur des mots-clés
 * Retourne: { sentiment: 'positive' | 'negative' | 'neutral', score: -1 to 1, keywords: [] }
 */

const POSITIVE_KEYWORDS = [
  'bien', 'mieux', 'heureux', 'heureuse', 'joie', 'content', 'contente', 'super', 'génial',
  'formidable', 'excellent', 'parfait', 'merveilleux', 'agréable', 'calme', 'serein', 'sereine',
  'paisible', 'reposé', 'reposée', 'énergique', 'motivé', 'motivée', 'optimiste', 'positif',
  'positive', 'espoir', 'sourire', 'rire', 'gratitude', 'reconnaissant', 'reconnaissante',
  'satisfait', 'satisfaite', 'fier', 'fière', 'confiant', 'confiante', 'fort', 'forte',
  'bien-être', 'équilibré', 'équilibrée', 'stable', 'meilleur', 'meilleure', 'progrès',
  'amélioration', 'réussite', 'succès', 'victoire', 'bonheur', 'plaisir', 'amour',
];

const NEGATIVE_KEYWORDS = [
  'mal', 'pire', 'triste', 'douleur', 'souffrance', 'difficile', 'épuisé', 'épuisée',
  'fatigué', 'fatiguée', 'stressé', 'stressée', 'anxieux', 'anxieuse', 'inquiet', 'inquiète',
  'peur', 'angoisse', 'déprimé', 'déprimée', 'découragé', 'découragée', 'frustré', 'frustrée',
  'irrité', 'irritée', 'énervé', 'énervée', 'colère', 'rage', 'désespoir', 'perdu', 'perdue',
  'seul', 'seule', 'isolé', 'isolée', 'vide', 'nul', 'nulle', 'horrible', 'terrible',
  'affreux', 'mauvais', 'mauvaise', 'négatif', 'négative', 'problème', 'difficulté',
  'échec', 'défaite', 'déçu', 'déçue', 'regret', 'culpabilité', 'honte', 'pleurs',
  'larmes', 'crise', 'insomnie', 'cauchemar', 'panique', 'nerveux', 'nerveuse',
];

const MENOPAUSE_SYMPTOMS = {
  positive: [
    'amélioration', 'moins de symptômes', 'mieux dormi', 'plus d\'énergie', 
    'sans bouffées', 'calme retrouvé', 'meilleur sommeil',
  ],
  negative: [
    'bouffées', 'sueurs', 'insomnie', 'fatigue intense', 'douleurs', 'migraines',
    'anxiété forte', 'irritabilité', 'brouillard mental', 'humeur basse',
  ],
};

/**
 * Analyse le sentiment d'un texte
 * @param {string} text - Le texte à analyser
 * @returns {Object} - { sentiment, score, keywords, confidence }
 */
export function analyzeSentiment(text) {
  if (!text || text.trim().length === 0) {
    return {
      sentiment: 'neutral',
      score: 0,
      keywords: [],
      confidence: 0,
      emoji: '😐',
    };
  }

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  // Comptage des mots positifs et négatifs
  let positiveCount = 0;
  let negativeCount = 0;
  const foundKeywords = {
    positive: [],
    negative: [],
  };

  // Vérifier les mots-clés généraux
  POSITIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      positiveCount++;
      foundKeywords.positive.push(keyword);
    }
  });

  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      negativeCount++;
      foundKeywords.negative.push(keyword);
    }
  });

  // Vérifier les symptômes ménopause
  MENOPAUSE_SYMPTOMS.positive.forEach(symptom => {
    if (lowerText.includes(symptom)) {
      positiveCount += 1.5; // Poids plus fort pour les symptômes
      foundKeywords.positive.push(symptom);
    }
  });

  MENOPAUSE_SYMPTOMS.negative.forEach(symptom => {
    if (lowerText.includes(symptom)) {
      negativeCount += 1.5;
      foundKeywords.negative.push(symptom);
    }
  });

  // Calculer le score (-1 à 1)
  const totalCount = positiveCount + negativeCount;
  let score = 0;
  
  if (totalCount > 0) {
    score = (positiveCount - negativeCount) / totalCount;
  }

  // Déterminer le sentiment
  let sentiment = 'neutral';
  let emoji = '😐';

  if (score > 0.2) {
    sentiment = 'positive';
    emoji = score > 0.6 ? '😊' : '🙂';
  } else if (score < -0.2) {
    sentiment = 'negative';
    emoji = score < -0.6 ? '😢' : '😕';
  }

  // Confiance basée sur le nombre de mots-clés trouvés
  const confidence = Math.min(totalCount / 5, 1); // Max confiance = 5 mots-clés

  return {
    sentiment,
    score: Math.round(score * 100) / 100, // Arrondir à 2 décimales
    keywords: {
      positive: foundKeywords.positive.slice(0, 3), // Top 3
      negative: foundKeywords.negative.slice(0, 3),
    },
    confidence: Math.round(confidence * 100) / 100,
    emoji,
    totalWords: words.length,
    keywordCount: totalCount,
  };
}

/**
 * Génère un message d'encouragement basé sur le sentiment
 * @param {Object} analysis - Résultat de analyzeSentiment
 * @returns {string}
 */
export function generateEncouragementMessage(analysis) {
  const { sentiment, score } = analysis;
  const language = analysis?.language; // backward-compatible if callers attach it
  const isEn = (language || 'fr').toLowerCase().startsWith('en');

  if (sentiment === 'positive') {
    const messages = isEn
      ? [
          "It's wonderful to hear you're feeling good! 🌸",
          "What a lovely day—keep it up! ✨",
          "Your positivity is inspiring! 💪",
          "Hold on to that great energy! 🌟",
        ]
      : [
          "C'est merveilleux de vous sentir si bien ! 🌸",
          "Quelle belle journée ! Continuez sur cette lancée ! ✨",
          "Votre positivité est inspirante ! 💪",
          "Gardez cette belle énergie ! 🌟",
        ];
    return messages[Math.floor(Math.random() * messages.length)];
  } else if (sentiment === 'negative') {
    const messages = isEn
      ? [
          "Hard days are part of the journey. You're not alone. 💗",
          "Be gentle with yourself today—tomorrow can feel different. 🌸",
          "Your courage through difficulties is admirable. 💪",
          "If you can, consider talking to your doctor or someone you trust. 🤗",
        ]
      : [
          "Les jours difficiles font partie du parcours. Vous n'êtes pas seule. 💗",
          "Prenez soin de vous aujourd'hui. Demain sera différent. 🌸",
          "Votre courage face aux difficultés est admirable. 💪",
          "N'hésitez pas à en parler avec votre médecin ou un proche. 🤗",
        ];
    return messages[Math.floor(Math.random() * messages.length)];
  } else {
    return isEn
      ? "Thank you for sharing how you feel. Every day counts. 🌿"
      : "Merci de partager votre ressenti. Chaque jour compte. 🌿";
  }
}

/**
 * Analyse les tendances émotionnelles sur plusieurs jours
 * @param {Array} logs - Array de daily_logs avec notes et sentiment
 * @returns {Object} - Statistiques et tendances
 */
export function analyzeTrends(logs) {
  if (!logs || logs.length === 0) {
    return {
      averageSentiment: 0,
      trend: 'stable',
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      mostCommonKeywords: [],
    };
  }

  const sentiments = logs
    .filter(log => log.notes_sentiment)
    .map(log => ({
      score: log.notes_sentiment_score || 0,
      sentiment: log.notes_sentiment,
    }));

  const averageSentiment = sentiments.length > 0
    ? sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length
    : 0;

  const positiveCount = sentiments.filter(s => s.sentiment === 'positive').length;
  const negativeCount = sentiments.filter(s => s.sentiment === 'negative').length;
  const neutralCount = sentiments.filter(s => s.sentiment === 'neutral').length;

  // Déterminer la tendance (en comparant première et deuxième moitié)
  let trend = 'stable';
  if (sentiments.length >= 4) {
    const midPoint = Math.floor(sentiments.length / 2);
    const firstHalf = sentiments.slice(0, midPoint);
    const secondHalf = sentiments.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

    if (secondAvg - firstAvg > 0.2) {
      trend = 'improving';
    } else if (firstAvg - secondAvg > 0.2) {
      trend = 'declining';
    }
  }

  return {
    averageSentiment: Math.round(averageSentiment * 100) / 100,
    trend,
    positiveCount,
    negativeCount,
    neutralCount,
    totalAnalyzed: sentiments.length,
  };
}
