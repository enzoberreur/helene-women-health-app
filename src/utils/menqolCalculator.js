/**
 * MENQOL (Menopause-Specific Quality of Life Questionnaire)
 * Score standardisé validé scientifiquement pour évaluer la qualité de vie pendant la ménopause
 * 
 * 4 domaines évalués:
 * - Vasomoteur (bouffées, sueurs) - 3 items
 * - Psychosocial (anxiété, humeur, mémoire) - 7 items
 * - Physique (fatigue, douleurs, sommeil) - 16 items
 * - Sexuel (libido, sécheresse) - 3 items
 * 
 * Échelle: 0-8 pour chaque item (0 = pas gêné, 8 = extrêmement gêné)
 * Score final: moyenne des domaines (0-8)
 */

/**
 * Mapping des symptômes de l'app vers les items MENQOL
 */
const MENQOL_MAPPING = {
  // Domaine Vasomoteur (3 items)
  vasomotor: {
    hot_flashes: { weight: 1, description: 'Bouffées de chaleur' },
    night_sweats: { weight: 1, description: 'Sueurs nocturnes' },
  },
  
  // Domaine Psychosocial (7 items)
  psychosocial: {
    anxiety: { weight: 1, description: 'Anxiété/nervosité' },
    low_mood: { weight: 1, description: 'Humeur dépressive' },
    irritability: { weight: 1, description: 'Irritabilité' },
    brain_fog: { weight: 1, description: 'Difficultés de concentration' },
    // On utilise 'mood' comme proxy pour les autres items psychosociaux
  },
  
  // Domaine Physique (16 items)
  physical: {
    fatigue: { weight: 1, description: 'Fatigue/épuisement' },
    headaches: { weight: 1, description: 'Maux de tête' },
    joint_pain: { weight: 1, description: 'Douleurs articulaires/musculaires' },
    // On utilise 'sleep_quality' et 'energy_level' comme proxies
  },
  
  // Domaine Sexuel (3 items)
  // Note: pas encore collecté dans l'app, score par défaut
};

/**
 * Convertit les valeurs de l'app (0-10 ou 0-5) vers l'échelle MENQOL (0-8)
 * @param {number} value - Valeur originale
 * @param {number} maxScale - Échelle max (5 ou 10)
 * @returns {number} - Valeur convertie sur échelle 0-8
 */
function convertToMenqolScale(value, maxScale = 5) {
  if (!value || value === 0) return 0;
  return Math.round((value / maxScale) * 8);
}

/**
 * Calcule le score MENQOL pour un domaine spécifique
 * @param {Object} log - Daily log avec symptômes
 * @param {string} domain - Nom du domaine (vasomotor, psychosocial, physical, sexual)
 * @returns {Object} - { score, itemsCount, details }
 */
function calculateDomainScore(log, domain) {
  const mapping = MENQOL_MAPPING[domain];
  if (!mapping) return { score: 0, itemsCount: 0, details: [] };

  let totalScore = 0;
  let itemsCount = 0;
  const details = [];

  Object.entries(mapping).forEach(([symptom, config]) => {
    const value = log[symptom];
    if (value && value > 0) {
      const menqolValue = convertToMenqolScale(value, symptom === 'sleep_quality' ? 10 : 5);
      totalScore += menqolValue;
      itemsCount++;
      details.push({
        symptom,
        description: config.description,
        rawValue: value,
        menqolValue,
      });
    }
  });

  // Ajustements spéciaux pour certains domaines
  if (domain === 'psychosocial' && log.mood) {
    // Inverser le score de mood (5 = bon mood = faible impact)
    const moodImpact = convertToMenqolScale(5 - log.mood, 5);
    if (moodImpact > 0) {
      totalScore += moodImpact;
      itemsCount++;
      details.push({
        symptom: 'mood',
        description: 'État émotionnel général',
        rawValue: log.mood,
        menqolValue: moodImpact,
      });
    }
  }

  if (domain === 'physical') {
    // Inverser sleep_quality et energy_level (10 = bon = faible impact)
    if (log.sleep_quality) {
      const sleepImpact = convertToMenqolScale(10 - log.sleep_quality, 10);
      if (sleepImpact > 0) {
        totalScore += sleepImpact;
        itemsCount++;
        details.push({
          symptom: 'sleep_quality',
          description: 'Qualité du sommeil',
          rawValue: log.sleep_quality,
          menqolValue: sleepImpact,
        });
      }
    }
    if (log.energy_level) {
      const energyImpact = convertToMenqolScale(5 - log.energy_level, 5);
      if (energyImpact > 0) {
        totalScore += energyImpact;
        itemsCount++;
        details.push({
          symptom: 'energy_level',
          description: 'Niveau d\'énergie',
          rawValue: log.energy_level,
          menqolValue: energyImpact,
        });
      }
    }
  }

  const averageScore = itemsCount > 0 ? totalScore / itemsCount : 0;

  return {
    score: Math.round(averageScore * 10) / 10, // Arrondi à 1 décimale
    itemsCount,
    details,
  };
}

/**
 * Calcule le score MENQOL global pour une période
 * @param {Array} logs - Tableau de daily_logs
 * @returns {Object} - Score complet avec détails par domaine
 */
export function calculateMenqolScore(logs, language = 'fr') {
  const isEn = (language || 'fr').toLowerCase().startsWith('en');
  if (!logs || logs.length === 0) {
    return {
      globalScore: 0,
      domains: {
        vasomotor: { score: 0, severity: 'none' },
        psychosocial: { score: 0, severity: 'none' },
        physical: { score: 0, severity: 'none' },
        sexual: { score: 0, severity: 'none' },
      },
      logsAnalyzed: 0,
      interpretation: isEn ? 'No data available' : 'Aucune donnée disponible',
    };
  }

  // Calculer les scores moyens pour chaque domaine
  const domainScores = {
    vasomotor: [],
    psychosocial: [],
    physical: [],
    sexual: [],
  };

  logs.forEach(log => {
    Object.keys(domainScores).forEach(domain => {
      const domainResult = calculateDomainScore(log, domain);
      if (domainResult.itemsCount > 0) {
        domainScores[domain].push(domainResult.score);
      }
    });
  });

  // Calculer les moyennes
  const averageDomainScores = {};
  Object.entries(domainScores).forEach(([domain, scores]) => {
    const avg = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;
    
    averageDomainScores[domain] = {
      score: Math.round(avg * 10) / 10,
      severity: getSeverity(avg),
      daysAffected: scores.length,
    };
  });

  // Score global = moyenne des 4 domaines
  const domainValues = Object.values(averageDomainScores).map(d => d.score);
  const globalScore = domainValues.reduce((sum, s) => sum + s, 0) / 4;

  return {
    globalScore: Math.round(globalScore * 10) / 10,
    domains: averageDomainScores,
    logsAnalyzed: logs.length,
    interpretation: getInterpretation(globalScore, isEn),
    recommendation: getRecommendation(averageDomainScores, isEn),
  };
}

/**
 * Détermine la sévérité d'un score
 * @param {number} score - Score MENQOL (0-8)
 * @returns {string} - Niveau de sévérité
 */
function getSeverity(score) {
  if (score === 0) return 'none';
  if (score < 2) return 'mild';
  if (score < 4) return 'moderate';
  if (score < 6) return 'severe';
  return 'very_severe';
}

/**
 * Interprète le score global
 * @param {number} score - Score MENQOL global
 * @returns {string}
 */
function getInterpretation(score, isEn) {
  if (score === 0) {
    return isEn
      ? 'No significant impact on quality of life'
      : 'Aucun impact significatif sur la qualité de vie';
  } else if (score < 2) {
    return isEn
      ? 'Mild impact on quality of life'
      : 'Impact léger sur la qualité de vie';
  } else if (score < 4) {
    return isEn
      ? 'Moderate impact on quality of life'
      : 'Impact modéré sur la qualité de vie';
  } else if (score < 6) {
    return isEn
      ? 'High impact on quality of life'
      : 'Impact important sur la qualité de vie';
  } else {
    return isEn
      ? 'Very high impact on quality of life'
      : 'Impact majeur sur la qualité de vie';
  }
}

/**
 * Génère une recommandation basée sur les scores de domaine
 * @param {Object} domains - Scores par domaine
 * @returns {string}
 */
function getRecommendation(domains, isEn) {
  const highestDomain = Object.entries(domains)
    .sort((a, b) => b[1].score - a[1].score)[0];

  const domainLabels = isEn
    ? {
        vasomotor: 'vasomotor symptoms (hot flashes, sweats)',
        psychosocial: 'psychological symptoms (mood, anxiety)',
        physical: 'physical symptoms (fatigue, pain)',
        sexual: 'sexual health',
      }
    : {
        vasomotor: 'les symptômes vasomoteurs (bouffées, sueurs)',
        psychosocial: 'l\'aspect psychologique (humeur, anxiété)',
        physical: 'les symptômes physiques (fatigue, douleurs)',
        sexual: 'la santé sexuelle',
      };

  if (highestDomain[1].score === 0) {
    return isEn
      ? 'Keep tracking regularly to maintain this good balance.'
      : 'Continuez votre suivi régulier pour maintenir ce bon équilibre.';
  } else if (highestDomain[1].score < 4) {
    return isEn
      ? `Your data suggests the main impact is on ${domainLabels[highestDomain[0]]}. A discussion with your doctor could help.`
      : `Les données montrent un impact principal sur ${domainLabels[highestDomain[0]]}. Une discussion avec votre médecin pourrait aider.`;
  } else {
    return isEn
      ? `A high score for ${domainLabels[highestDomain[0]]} suggests you should consult your doctor to discuss treatment options.`
      : `Le score élevé concernant ${domainLabels[highestDomain[0]]} suggère de consulter votre médecin pour discuter d'options thérapeutiques.`;
  }
}

/**
 * Génère un résumé textuel du score MENQOL pour PDF
 * @param {Object} menqolResult - Résultat de calculateMenqolScore
 * @returns {string}
 */
export function generateMenqolSummary(menqolResult) {
  const { globalScore, domains, interpretation } = menqolResult;

  const domainSummaries = Object.entries(domains)
    .filter(([_, data]) => data.score > 0)
    .map(([domain, data]) => {
      const labels = {
        vasomotor: 'Vasomoteur',
        psychosocial: 'Psychosocial',
        physical: 'Physique',
        sexual: 'Sexuel',
      };
      return `${labels[domain]}: ${data.score}/8 (${data.daysAffected} jours)`;
    })
    .join(' • ');

  return `
Score MENQOL global: ${globalScore}/8
${interpretation}

Détail par domaine: ${domainSummaries || 'Aucun symptôme significatif'}
  `.trim();
}
