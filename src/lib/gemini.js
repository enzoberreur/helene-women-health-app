import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
const API_KEY = extra.geminiApiKey;
const MODEL = extra.geminiModel || 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Configuration du modèle
const modelConfig = {
  temperature: 0.9,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

// System prompt pour le Menopause Copilot
const SYSTEM_PROMPT = `Tu es Hélène, une assistante IA empathique et compétente spécialisée dans l'accompagnement des femmes pendant la périménopause et la ménopause. Ton rôle est d'aider, d'éduquer et de soutenir les femmes dans cette transition.

Tes caractéristiques :
- **Empathique** : Tu comprends les défis émotionnels et physiques
- **Éducative** : Tu fournis des informations médicales claires et accessibles
- **Personnalisée** : Tu t'adaptes à chaque femme en fonction de son âge, ses symptômes et son contexte
- **Bienveillante** : Tu normalises cette phase de vie sans jugement
- **Evidence-based** : Tes conseils sont basés sur la science médicale

Ce que tu dois faire :
✅ Expliquer les symptômes et changements hormonaux de manière simple
✅ Proposer des conseils lifestyle (alimentation, exercice, sommeil, gestion du stress)
✅ Suggérer quand consulter un médecin
✅ Rassurer et normaliser les expériences
✅ Offrir un soutien émotionnel authentique

Ce que tu NE dois PAS faire :
❌ Poser un diagnostic médical
❌ Prescrire des traitements ou médicaments
❌ Remplacer un avis médical professionnel
❌ Minimiser les symptômes ou inquiétudes

Ton ton est :
- Chaleureux et amical (tutoyez)
- Professionnel mais accessible
- Compréhensif et patient
- Encourageant et positif

Format de tes réponses :
- Concises mais complètes (2-4 paragraphes max)
- Structure claire avec des lignes pour séparer les idées
- Utilise des emojis occasionnellement pour humaniser (🌸, 💪, 😊, 💚)
- Termine par une question d'engagement ou un encouragement`;

/**
 * Génère une réponse du chatbot basée sur le contexte utilisateur et l'historique
 * @param {string} userMessage - Message de l'utilisateur
 * @param {Object} userContext - Contexte utilisateur (âge, symptômes, etc.)
 * @param {Array} conversationHistory - Historique de conversation (optionnel)
 * @returns {Promise<string>} - Réponse du chatbot
 */
export async function generateChatResponse(userMessage, userContext = {}, conversationHistory = []) {
  // MODE DEMO : Réponses simulées intelligentes (quota API dépassé)
  // Mettre USE_DEMO_MODE à false pour réactiver l'API Gemini réelle
  const USE_DEMO_MODE = true;
  
  if (USE_DEMO_MODE) {
    console.log('🎭 Mode démo activé - Réponse simulée...');
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simuler délai API
    return generateDemoResponse(userMessage, userContext);
  }

  if (!API_KEY) {
    throw new Error('Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in .env');
  }

  try {
    // Construire le contexte utilisateur
    const contextPrompt = buildUserContext(userContext);
    
    // Construire l'historique de conversation
    const historyPrompt = conversationHistory.length > 0 
      ? `\n\nHistorique récent:\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'Utilisatrice' : 'Hélène'}: ${msg.content}`).join('\n')}`
      : '';

    // Prompt complet
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextPrompt}${historyPrompt}\n\nUtilisatrice: ${userMessage}\n\nHélène:`;

    console.log('🤖 Appel Gemini API REST...');

    // Appeler l'API REST de Gemini
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: modelConfig,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erreur API:', response.status, errorData);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Réponse Gemini reçue');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Pas de réponse générée');
    }

    const text = data.candidates[0].content.parts[0].text;
    return text;

  } catch (error) {
    console.error('❌ Erreur Gemini complète:', error);
    console.error('Message:', error.message);
    
    // Message d'erreur user-friendly
    if (error.message?.includes('API key') || error.message?.includes('403')) {
      throw new Error('Problème de configuration API. Contactez le support 🙏');
    } else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
      throw new Error('Problème de connexion. Vérifiez votre internet 📡');
    } else {
      throw new Error('Je rencontre un problème technique. Réessayez dans un instant 🙏');
    }
  }
}

/**
 * Construit le contexte utilisateur pour personnaliser les réponses
 */
function buildUserContext(userContext) {
  const {
    age,
    menopauseStage,
    recentSymptoms,
    goals,
  } = userContext;

  let context = 'Contexte de l\'utilisatrice:\n';
  
  if (age) {
    context += `- Âge: ${age} ans\n`;
  }
  
  if (menopauseStage) {
    const stageLabels = {
      pre: 'Pré-ménopause',
      peri: 'Périménopause',
      meno: 'Ménopause',
      post: 'Post-ménopause',
    };
    context += `- Phase: ${stageLabels[menopauseStage]}\n`;
  }
  
  if (recentSymptoms && Object.keys(recentSymptoms).length > 0) {
    const symptoms = Object.entries(recentSymptoms)
      .filter(([_, intensity]) => intensity > 0)
      .map(([symptom, intensity]) => {
        const labels = {
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
        const intensityLabels = ['', 'légers', 'modérés', 'sévères'];
        return `${labels[symptom]} (${intensityLabels[intensity]})`;
      });
    
    if (symptoms.length > 0) {
      context += `- Symptômes récents: ${symptoms.join(', ')}\n`;
    }
  }
  
  if (goals && goals.length > 0) {
    context += `- Objectifs: ${goals.join(', ')}\n`;
  }

  return context;
}

/**
 * Génère un résumé hebdomadaire personnalisé basé sur les logs
 * @param {Object} userProfile - Profil utilisateur
 * @param {Array} weeklyLogs - Logs des 7 derniers jours
 * @returns {Promise<string>} - Résumé hebdomadaire
 */
export async function generateWeeklySummary(userProfile, weeklyLogs) {
  try {
    const contextPrompt = `Tu es Hélène, assistante IA spécialisée en santé des femmes.
    
Génère un résumé hebdomadaire empathique et personnalisé pour cette utilisatrice.

Profil:
- Âge: ${userProfile.age} ans
- Phase: ${userProfile.menopause_stage}

Logs des 7 derniers jours:
${weeklyLogs.map((log, index) => `
Jour ${index + 1}:
- Humeur: ${log.mood}/5
- Énergie: ${log.energy_level}/5
- Sommeil: ${log.sleep_quality}/5
- Symptômes physiques notables: ${getNotableSymptoms(log, 'physical')}
- Symptômes mentaux notables: ${getNotableSymptoms(log, 'mental')}
${log.notes ? `- Notes: ${log.notes}` : ''}
`).join('\n')}

Crée un résumé incluant:
1. Une observation générale de la semaine (2-3 lignes)
2. Les tendances positives
3. Les points d'attention
4. Des conseils personnalisés (2-3 conseils concrets)
5. Un message encourageant

Utilise un ton chaleureux, des emojis occasionnels, et structure avec des paragraphes courts.`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: modelConfig,
    });

    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Erreur génération résumé:', error);
    throw error;
  }
}

/**
 * Helper pour extraire les symptômes notables
 */
function getNotableSymptoms(log, category) {
  const physicalSymptoms = ['hot_flashes', 'night_sweats', 'headaches', 'joint_pain', 'fatigue'];
  const mentalSymptoms = ['anxiety', 'irritability', 'brain_fog', 'low_mood'];
  
  const symptoms = category === 'physical' ? physicalSymptoms : mentalSymptoms;
  const notable = symptoms
    .filter(s => log[s] && log[s] >= 2)
    .map(s => {
      const labels = {
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
      return labels[s];
    });
  
  return notable.length > 0 ? notable.join(', ') : 'Aucun';
}

/**
 * Génère une réponse démo intelligente basée sur le message utilisateur
 * (utilisé quand le quota API est dépassé ou pour les démos)
 */
function generateDemoResponse(userMessage, userContext) {
  const msg = userMessage.toLowerCase();
  
  // Réponses contextuelles basées sur les mots-clés
  if (msg.includes('bonjour') || msg.includes('salut') || msg.includes('hello') || msg.includes('hi')) {
    return `Bonjour ! 🌸 Je suis Hélène, ravie de pouvoir t'accompagner aujourd'hui. 

Comment te sens-tu ? N'hésite pas à me parler de ce qui te préoccupe, je suis là pour t'écouter et te soutenir dans cette étape de ta vie.`;
  }
  
  if (msg.includes('bouffée') || msg.includes('chaleur') || msg.includes('chaud')) {
    return `Les bouffées de chaleur sont l'un des symptômes les plus fréquents de la ménopause. Elles sont causées par les fluctuations hormonales qui perturbent ton thermostat interne. 🌡️

Quelques conseils qui peuvent t'aider :
• Habille-toi en plusieurs couches pour ajuster facilement
• Évite les déclencheurs : café, alcool, plats épicés
• Pratique la respiration profonde (inspire 4 sec, expire 8 sec)
• Garde une petite serviette fraîche à portée de main

Ces épisodes sont temporaires même si c'est inconfortable. Si elles deviennent vraiment invalidantes, parle-en à ton médecin - il existe des traitements efficaces. 💙

Est-ce que tu arrives à identifier des situations qui les déclenchent ?`;
  }
  
  if (msg.includes('sommeil') || msg.includes('dormir') || msg.includes('insomnie') || msg.includes('fatigue') || msg.includes('fatiguée')) {
    return `Les troubles du sommeil pendant la périménopause sont très courants, et je comprends à quel point c'est épuisant. 😴

Voici ce qui peut t'aider :
• Crée une routine régulière : couche-toi et lève-toi aux mêmes heures
• Évite les écrans 1h avant le coucher
• Garde ta chambre fraîche (17-19°C idéalement)
• Essaie la méditation ou des exercices de relaxation
• Limite la caféine après 14h

Si tu te réveilles en sueur la nuit, c'est souvent lié aux fluctuations hormonales. Un ventilateur et des draps en coton respirant peuvent vraiment aider.

Comment dors-tu en ce moment ? Tu te réveilles souvent la nuit ?`;
  }
  
  if (msg.includes('humeur') || msg.includes('triste') || msg.includes('anxiété') || msg.includes('anxieuse') || msg.includes('stressée') || msg.includes('émotions') || msg.includes('pleurer')) {
    return `Je comprends tellement. Les fluctuations hormonales peuvent vraiment impacter ton humeur et tes émotions. Tu n'es pas "folle" et ce n'est pas dans ta tête - c'est physiologique. 💗

Ce qui peut t'aider :
• L'exercice physique (même 20 min de marche) libère des endorphines
• Le yoga et la méditation pour réguler le stress
• Parler à des amies qui traversent la même chose
• Tenir un journal pour exprimer tes émotions
• Les oméga-3 (poissons gras, noix) aident à stabiliser l'humeur

Si tu sens que c'est vraiment difficile au quotidien, n'hésite pas à en parler à un professionnel. Il n'y a aucune honte à demander de l'aide.

Tu traverses une grande transition, sois bienveillante avec toi-même. 🌸`;
  }
  
  if (msg.includes('poids') || msg.includes('grossir') || msg.includes('ventre') || msg.includes('maigrir')) {
    return `Les changements de poids et de silhouette pendant la ménopause sont très fréquents. La baisse d'œstrogènes modifie la répartition des graisses (souvent plus au niveau du ventre). 

Quelques pistes pour t'aider :
• Privilégie les protéines (maintiennent la masse musculaire)
• Limite les sucres rapides et aliments ultra-transformés
• Fais de la musculation légère (préserve les muscles)
• Reste active au quotidien (marche, escaliers...)
• Gère ton stress (le cortisol favorise le stockage abdominal)

Sois patiente avec ton corps - il traverse une grande transformation. L'objectif n'est pas la perfection mais ta santé et ton bien-être. 💪

Tu fais déjà de l'exercice régulièrement ?`;
  }
  
  if (msg.includes('exercice') || msg.includes('sport') || msg.includes('activité') || msg.includes('bouger')) {
    return `L'activité physique est vraiment ton meilleure alliée pendant cette période ! 🏃‍♀️

Les bénéfices :
• Réduit les bouffées de chaleur
• Améliore le sommeil et l'humeur
• Préserve la densité osseuse et la masse musculaire
• Aide à gérer le poids

L'idéal :
• 30 min d'activité modérée 5x/semaine (marche rapide, vélo, natation)
• 2-3 sessions de renforcement musculaire par semaine
• Des étirements et du yoga pour la flexibilité

Commence doucement et augmente progressivement. L'important c'est la régularité, pas l'intensité ! 

Qu'est-ce qui te plairait comme activité ?`;
  }
  
  if (msg.includes('alimentation') || msg.includes('manger') || msg.includes('nutrition') || msg.includes('régime')) {
    return `L'alimentation joue un rôle clé pour mieux vivre cette transition ! 🥗

Privilégie :
• Protéines à chaque repas (poisson, œufs, légumineuses)
• Calcium et vitamine D (produits laitiers, sardines, soleil)
• Phytoestrogènes (soja, graines de lin)
• Oméga-3 (poissons gras, noix)
• Beaucoup de légumes et fruits

Limite :
• Sucres raffinés et aliments ultra-transformés
• Alcool (aggrave les bouffées de chaleur)
• Excès de caféine (peut perturber le sommeil)
• Sel (rétention d'eau)

Pas besoin d'être parfaite - fais de ton mieux et écoute ton corps. Comment manges-tu actuellement ?`;
  }
  
  if (msg.includes('libido') || msg.includes('sexe') || msg.includes('sécheresse') || msg.includes('désir')) {
    return `C'est une préoccupation très courante et légitime. La baisse d'œstrogènes peut effectivement impacter la libido et causer de la sécheresse vaginale.

Sache que :
• C'est normal et tu n'es pas seule dans ce cas
• Ça ne signifie pas la fin de ta vie sexuelle !
• Il existe des solutions efficaces

Ce qui peut aider :
• Des lubrifiants à base d'eau pour le confort
• Les hydratants vaginaux (à utiliser régulièrement)
• La communication avec ton/ta partenaire
• Prendre le temps des préliminaires
• Parler à ton gynéco des traitements locaux possibles

Ta sexualité peut évoluer mais elle peut rester épanouie. N'hésite pas à en parler à un professionnel. 💗`;
  }

  if (msg.includes('médecin') || msg.includes('docteur') || msg.includes('consulter') || msg.includes('traitement')) {
    return `C'est une excellente question ! Il est important de consulter un médecin si :

• Tes symptômes impactent vraiment ta qualité de vie
• Tu as des saignements irréguliers ou abondants
• Tu ressens une détresse émotionnelle importante
• Tu envisages un traitement hormonal
• Tu as des questions sur ta santé osseuse

Un gynécologue ou médecin généraliste spécialisé peut t'aider avec :
• Un bilan hormonal si nécessaire
• Des traitements adaptés (hormonaux ou non)
• Un suivi personnalisé de tes symptômes

N'hésite pas à prendre rendez-vous - tu mérites d'être accompagnée ! 🩺`;
  }
  
  if (msg.includes('merci') || msg.includes('thank')) {
    return `Avec plaisir ! 🌸 Je suis là pour toi. N'hésite pas à me parler chaque fois que tu en ressens le besoin. Prends soin de toi ! 💕`;
  }

  if (msg.includes('aide') || msg.includes('aider') || msg.includes('faire')) {
    return `Je suis là pour t'accompagner dans cette période de transition ! 🌸

Je peux t'aider avec :
• Des informations sur les symptômes de la ménopause
• Des conseils lifestyle (alimentation, exercice, sommeil)
• Du soutien émotionnel et de l'écoute
• Des suggestions pour améliorer ton bien-être
• T'orienter quand consulter un médecin

Parle-moi de ce qui te préoccupe en ce moment, et on va voir ensemble comment je peux t'aider !`;
  }
  
  // Réponse générique empathique
  const genericResponses = [
    `Je t'écoute. 🌸 Peux-tu m'en dire un peu plus sur ce que tu ressens ? Cela m'aidera à mieux t'accompagner.`,
    `Merci de te confier à moi. Ce que tu vis est tout à fait légitime. Dis-m'en plus sur ta situation, je suis là pour t'aider.`,
    `Je comprends que cette période puisse être difficile. Tu n'es pas seule. Qu'est-ce qui te préoccupe le plus en ce moment ?`,
    `C'est important que tu puisses exprimer ce que tu ressens. Je suis là pour t'écouter et t'accompagner. Raconte-moi ce qui se passe pour toi.`,
    `Je suis là pour toi. 💗 N'hésite pas à me parler de ce que tu vis - que ce soit physique ou émotionnel. Comment puis-je t'aider aujourd'hui ?`
  ];
  
  return genericResponses[Math.floor(Math.random() * genericResponses.length)];
}

export default {
  generateChatResponse,
  generateWeeklySummary,
};
