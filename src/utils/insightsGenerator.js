/**
 * Générateur d'insights automatiques basés sur les données de santé
 */

export const generateWeeklyInsights = (logs, language = 'fr') => {
  if (!logs || logs.length === 0) return [];

  const isEn = (language || 'fr').toLowerCase().startsWith('en');

  const insights = [];
  const currentWeekLogs = logs.slice(0, 7);
  const previousWeekLogs = logs.slice(7, 14);

  // 1. Tendance humeur
  const currentMoodAvg = calculateAverage(currentWeekLogs, 'mood');
  const previousMoodAvg = calculateAverage(previousWeekLogs, 'mood');
  
  if (previousMoodAvg > 0) {
    const moodChange = ((currentMoodAvg - previousMoodAvg) / previousMoodAvg) * 100;
    if (Math.abs(moodChange) > 10) {
      insights.push({
        id: 'mood-trend',
        type: moodChange > 0 ? 'positive' : 'warning',
        icon: moodChange > 0 ? 'trending-up' : 'trending-down',
        title: isEn ? 'Mood trend' : 'Tendance humeur',
        message: isEn
          ? `Your mood is ${moodChange > 0 ? 'up' : 'down'} by ${Math.abs(moodChange).toFixed(0)}% this week`
          : `Votre humeur est ${moodChange > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(moodChange).toFixed(0)}% cette semaine`,
        value: `${currentMoodAvg.toFixed(1)}/5`,
      });
    }
  }

  // 2. Qualité du sommeil
  const currentSleepAvg = calculateAverage(currentWeekLogs, 'sleep_quality');
  const previousSleepAvg = calculateAverage(previousWeekLogs, 'sleep_quality');
  
  if (previousSleepAvg > 0) {
    const sleepChange = currentSleepAvg - previousSleepAvg;
    if (Math.abs(sleepChange) > 1) {
      insights.push({
        id: 'sleep-trend',
        type: sleepChange > 0 ? 'positive' : 'info',
        icon: 'moon',
        title: isEn ? 'Sleep' : 'Sommeil',
        message: isEn
          ? `You ${sleepChange > 0 ? 'slept better' : 'slept worse'} this week (${sleepChange > 0 ? '+' : ''}${sleepChange.toFixed(1)}h)`
          : `Vous avez ${sleepChange > 0 ? 'mieux dormi' : 'moins bien dormi'} cette semaine (${sleepChange > 0 ? '+' : ''}${sleepChange.toFixed(1)}h)`,
        value: `${currentSleepAvg.toFixed(1)}/10`,
      });
    }
  }

  // 3. Meilleure journée de la semaine
  const bestDay = findBestDay(currentWeekLogs);
  if (bestDay) {
    const dayNames = isEn
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[bestDay.dayOfWeek];
    insights.push({
      id: 'best-day',
      type: 'positive',
      icon: 'star',
      title: isEn ? 'Best day' : 'Meilleure journée',
      message: isEn
        ? `${dayName} was your best day (mood ${bestDay.mood}/5)`
        : `${dayName} était votre meilleur jour (humeur ${bestDay.mood}/5)`,
      value: dayName,
    });
  }

  // 4. Symptômes principaux
  const topSymptoms = findTopSymptoms(currentWeekLogs, 2);
  if (topSymptoms.length > 0) {
    const symptomLabels = isEn
      ? {
          hot_flashes: 'hot flashes',
          night_sweats: 'night sweats',
          headaches: 'headaches',
          joint_pain: 'joint pain',
          fatigue: 'fatigue',
          anxiety: 'anxiety',
          irritability: 'irritability',
          brain_fog: 'brain fog',
          low_mood: 'low mood',
        }
      : {
          hot_flashes: 'bouffées de chaleur',
          night_sweats: 'sueurs nocturnes',
          headaches: 'maux de tête',
          joint_pain: 'douleurs articulaires',
          fatigue: 'fatigue',
          anxiety: 'anxiété',
          irritability: 'irritabilité',
          brain_fog: 'brouillard mental',
          low_mood: 'humeur basse',
        };

    const symptomList = topSymptoms
      .map(s => symptomLabels[s.symptom] || s.symptom)
      .join(isEn ? ' and ' : ' et ');

    const topCount = topSymptoms[0].count;
    const dayLabel = isEn
      ? (topCount === 1 ? 'day' : 'days')
      : (topCount === 1 ? 'jour' : 'jours');

    insights.push({
      id: 'top-symptoms',
      type: 'warning',
      icon: 'pulse',
      title: isEn ? 'Top symptoms' : 'Symptômes principaux',
      message: isEn ? `This week: ${symptomList}` : `Cette semaine : ${symptomList}`,
      value: `${topCount} ${dayLabel}`,
    });
  }

  // 5. Pattern temporel (matin vs soir)
  const morningPattern = analyzeTimePattern(currentWeekLogs, 'morning');
  if (morningPattern) {
    insights.push({
      id: 'time-pattern',
      type: 'info',
      icon: 'time',
      title: isEn ? 'Pattern spotted' : 'Pattern observé',
      message: isEn
        ? morningPattern
            .replace('Vos symptômes sont plus fréquents le soir', 'Your symptoms are more frequent in the evening')
            .replace('Vos symptômes sont plus fréquents le matin', 'Your symptoms are more frequent in the morning')
        : morningPattern,
      value: '',
    });
  }

  // 6. Énergie
  const energyAvg = calculateAverage(currentWeekLogs, 'energy_level');
  if (energyAvg > 0) {
    insights.push({
      id: 'energy',
      type: energyAvg >= 3 ? 'positive' : 'info',
      icon: 'flash',
      title: isEn ? 'Energy level' : "Niveau d'énergie",
      message: isEn
        ? `Your average energy is ${energyAvg.toFixed(1)}/5`
        : `Votre énergie moyenne est de ${energyAvg.toFixed(1)}/5`,
      value: isEn ? (energyAvg >= 3 ? 'Good' : 'To watch') : (energyAvg >= 3 ? 'Bon' : 'À surveiller'),
    });
  }

  // 7. Consistance du tracking
  const consistencyRate = (currentWeekLogs.length / 7) * 100;
  if (consistencyRate >= 80) {
    insights.push({
      id: 'consistency',
      type: 'positive',
      icon: 'checkmark-circle',
      title: isEn ? 'Great consistency' : 'Excellent suivi',
      message: isEn
        ? `You completed ${currentWeekLogs.length}/7 check-ins this week`
        : `Vous avez complété ${currentWeekLogs.length}/7 check-ins cette semaine`,
      value: `${consistencyRate.toFixed(0)}%`,
    });
  }

  return insights.slice(0, 5); // Limiter à 5 insights max
};

// Fonctions utilitaires
const calculateAverage = (logs, field) => {
  const values = logs.map(log => log[field]).filter(v => v != null && v > 0);
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const findBestDay = (logs) => {
  let bestLog = null;
  let highestMood = 0;

  logs.forEach(log => {
    if (log.mood > highestMood) {
      highestMood = log.mood;
      bestLog = {
        ...log,
        dayOfWeek: new Date(log.log_date).getDay(),
        mood: log.mood,
      };
    }
  });

  return bestLog;
};

const findTopSymptoms = (logs, limit = 3) => {
  const symptoms = ['hot_flashes', 'night_sweats', 'headaches', 'joint_pain', 'fatigue', 'anxiety', 'irritability', 'brain_fog', 'low_mood'];
  const symptomCounts = {};

  symptoms.forEach(symptom => {
    symptomCounts[symptom] = logs.filter(log => log[symptom] && log[symptom] > 0).length;
  });

  return Object.entries(symptomCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([symptom, count]) => ({ symptom, count }));
};

const analyzeTimePattern = (logs) => {
  // Analyser si les bouffées de chaleur sont plus fréquentes à certains moments
  const symptoms = ['hot_flashes', 'night_sweats'];
  let morningCount = 0;
  let eveningCount = 0;

  logs.forEach(log => {
    symptoms.forEach(symptom => {
      if (log[symptom] && log[symptom] > 0) {
        // Simulation : on pourrait ajouter un champ time_of_day dans le futur
        // Pour l'instant, on fait une estimation basée sur les symptômes
        if (symptom === 'hot_flashes') morningCount++;
        if (symptom === 'night_sweats') eveningCount++;
      }
    });
  });

  if (eveningCount > morningCount && eveningCount >= 3) {
    return 'Vos symptômes sont plus fréquents le soir';
  } else if (morningCount > eveningCount && morningCount >= 3) {
    return 'Vos symptômes sont plus fréquents le matin';
  }

  return null;
};

/**
 * Détecte les drapeaux rouges médicaux nécessitant une consultation urgente
 * @param {Array} logs - Logs des 7-30 derniers jours
 * @returns {Array} - Liste des alertes avec niveau de sévérité
 */
export const detectRedFlags = (logs) => {
  if (!logs || logs.length === 0) return [];

  const alerts = [];
  const recentLogs = logs.slice(0, 7); // 7 derniers jours pour alertes urgentes
  const extendedLogs = logs.slice(0, 14); // 14 jours pour patterns

  // 1. ALERTE ROUGE: Symptômes cardiovasculaires persistants
  const chestPainDays = recentLogs.filter(log => 
    log.notes && log.notes.toLowerCase().includes('douleur thoracique') ||
    log.notes && log.notes.toLowerCase().includes('douleur poitrine') ||
    log.notes && log.notes.toLowerCase().includes('douleur cœur')
  ).length;

  const palpitationsDays = recentLogs.filter(log =>
    log.notes && (
      log.notes.toLowerCase().includes('palpitation') ||
      log.notes.toLowerCase().includes('battement')
    )
  ).length;

  if (chestPainDays >= 2) {
    alerts.push({
      id: 'red-flag-chest-pain',
      severity: 'critical',
      icon: 'warning',
      title: '⚠️ Douleurs thoraciques',
      message: 'Vous avez signalé des douleurs thoraciques plusieurs fois cette semaine. Ceci nécessite une consultation médicale URGENTE.',
      action: 'Consultez immédiatement',
      color: '#EF4444',
      priority: 1,
    });
  } else if (palpitationsDays >= 3) {
    alerts.push({
      id: 'red-flag-palpitations',
      severity: 'high',
      icon: 'heart-dislike',
      title: '💔 Palpitations fréquentes',
      message: 'Les palpitations fréquentes peuvent nécessiter un suivi cardiaque. Parlez-en à votre médecin.',
      action: 'Consulter rapidement',
      color: '#F97316',
      priority: 2,
    });
  }

  // 2. ALERTE ROUGE: Dépression sévère persistante
  const severeLowMoodDays = recentLogs.filter(log => log.mood && log.mood <= 2).length;
  const suicidalThoughts = recentLogs.filter(log =>
    log.notes && (
      log.notes.toLowerCase().includes('suicide') ||
      log.notes.toLowerCase().includes('mourir') ||
      log.notes.toLowerCase().includes('en finir')
    )
  ).length;

  if (suicidalThoughts > 0) {
    alerts.push({
      id: 'red-flag-suicidal',
      severity: 'critical',
      icon: 'alert-circle',
      title: '🆘 Pensées suicidaires',
      message: 'Vous n\'êtes pas seule. Contactez immédiatement le 3114 (numéro national de prévention du suicide) ou rendez-vous aux urgences.',
      action: 'Appeler le 3114',
      color: '#DC2626',
      priority: 0, // PRIORITÉ MAXIMALE
    });
  } else if (severeLowMoodDays >= 5) {
    alerts.push({
      id: 'red-flag-severe-depression',
      severity: 'high',
      icon: 'sad',
      title: '😢 Humeur très basse persistante',
      message: 'Votre humeur est très basse depuis plus de 5 jours. Une consultation avec un professionnel de santé mentale est recommandée.',
      action: 'Consulter un psychologue',
      color: '#F97316',
      priority: 2,
    });
  }

  // 3. ALERTE ORANGE: Symptômes neurologiques inhabituels
  const severeHeadaches = recentLogs.filter(log => log.headaches && log.headaches >= 4).length;

  if (severeHeadaches >= 3) {
    alerts.push({
      id: 'red-flag-headaches',
      severity: 'medium',
      icon: 'thunderstorm',
      title: '🤕 Maux de tête intenses',
      message: 'Des maux de tête intenses et fréquents peuvent nécessiter une évaluation médicale pour écarter d\'autres causes.',
      action: 'Consulter votre médecin',
      color: '#F59E0B',
      priority: 3,
    });
  }

  // 4. ALERTE JAUNE: Insomnie sévère prolongée
  const severeSleepIssues = extendedLogs.filter(log => log.sleep_quality && log.sleep_quality <= 3).length;

  if (severeSleepIssues >= 7) {
    alerts.push({
      id: 'red-flag-insomnia',
      severity: 'medium',
      icon: 'moon',
      title: '😴 Insomnie sévère',
      message: 'Vous dormez mal depuis au moins une semaine. Un mauvais sommeil prolongé peut affecter votre santé globale.',
      action: 'Discuter avec votre médecin',
      color: '#F59E0B',
      priority: 4,
    });
  }

  // 5. ALERTE JAUNE: Symptômes vasomoteurs extrêmes
  const extremeHotFlashes = recentLogs.filter(log => log.hot_flashes && log.hot_flashes === 5).length;
  const extremeNightSweats = recentLogs.filter(log => log.night_sweats && log.night_sweats === 5).length;

  if (extremeHotFlashes >= 5 || extremeNightSweats >= 5) {
    alerts.push({
      id: 'red-flag-extreme-vasomotor',
      severity: 'medium',
      icon: 'flame',
      title: '🔥 Symptômes vasomoteurs intenses',
      message: 'Vos bouffées de chaleur ou sueurs sont particulièrement intenses. Discutez des options de traitement avec votre médecin.',
      action: 'Envisager un traitement',
      color: '#F59E0B',
      priority: 5,
    });
  }

  // 6. ALERTE INFO: Fatigue extrême persistante
  const extremeFatigue = recentLogs.filter(log => log.fatigue && log.fatigue >= 4).length;
  const lowEnergy = recentLogs.filter(log => log.energy_level && log.energy_level <= 2).length;

  if (extremeFatigue >= 5 && lowEnergy >= 5) {
    alerts.push({
      id: 'red-flag-chronic-fatigue',
      severity: 'low',
      icon: 'battery-dead',
      title: '🪫 Fatigue chronique',
      message: 'Une fatigue persistante peut avoir plusieurs causes. Un bilan sanguin (thyroïde, fer, vitamine D) pourrait être utile.',
      action: 'Demander un bilan',
      color: '#3B82F6',
      priority: 6,
    });
  }

  // Trier par priorité (0 = le plus urgent)
  return alerts.sort((a, b) => a.priority - b.priority);
};

export const generateMonthlyInsights = (logs) => {
  if (!logs || logs.length < 7) return [];

  const insights = [];
  
  // Tendances mensuelles
  const moodAvg = calculateAverage(logs, 'mood');
  const sleepAvg = calculateAverage(logs, 'sleep_quality');
  const energyAvg = calculateAverage(logs, 'energy_level');

  insights.push({
    id: 'monthly-overview',
    type: 'info',
    icon: 'analytics',
    title: 'Vue d\'ensemble du mois',
    message: `Humeur: ${moodAvg.toFixed(1)}/5 • Sommeil: ${sleepAvg.toFixed(1)}/10 • Énergie: ${energyAvg.toFixed(1)}/5`,
    value: `${logs.length} jours`,
  });

  // Symptômes mensuels
  const topSymptoms = findTopSymptoms(logs, 3);
  if (topSymptoms.length > 0) {
    const symptomLabels = {
      hot_flashes: 'Bouffées de chaleur',
      night_sweats: 'Sueurs nocturnes',
      headaches: 'Maux de tête',
      joint_pain: 'Douleurs articulaires',
      fatigue: 'Fatigue',
      anxiety: 'Anxiété',
      irritability: 'Irritabilité',
      brain_fog: 'Brouillard mental',
      low_mood: 'Humeur basse',
    };

    topSymptoms.forEach((symptom, index) => {
      insights.push({
        id: `monthly-symptom-${index}`,
        type: 'warning',
        icon: 'medical',
        title: symptomLabels[symptom.symptom] || symptom.symptom,
        message: `Présent ${symptom.count} jours ce mois-ci`,
        value: `${((symptom.count / logs.length) * 100).toFixed(0)}%`,
      });
    });
  }

  return insights;
};
