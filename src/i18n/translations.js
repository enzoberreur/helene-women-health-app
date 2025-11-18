export const translations = {
  fr: {
    // Landing Page
    landing: {
      title: 'Hélène',
      tagline: 'Votre compagne bien-être',
      email: 'Email',
      password: 'Mot de passe',
      login: 'Se connecter',
      loggingIn: 'Connexion...',
      forgotPassword: 'Mot de passe oublié ?',
      createAccount: 'Créer un compte',
    },
    
    // Onboarding
    onboarding: {
      createAccount: 'Créer un compte',
      step: 'Étape',
      next: 'Suivant',
      start: 'Commencer',
      creating: 'Création du compte...',
      
      // Step 0
      step0: {
        title: 'Créons votre compte',
        subtitle: 'Vos identifiants pour accéder à l\'application',
        email: 'Email',
        emailPlaceholder: 'votre@email.com',
        password: 'Mot de passe',
        passwordPlaceholder: 'Au moins 6 caractères',
        passwordHelper: 'Minimum 6 caractères',
      },
      
      // Step 1
      step1: {
        title: 'Informations de base',
        subtitle: 'Pour personnaliser vos recommandations',
        age: 'Âge',
        agePlaceholder: 'Ex: 48',
        weight: 'Poids (kg)',
        weightPlaceholder: 'Ex: 65',
        height: 'Taille (cm)',
        heightPlaceholder: 'Ex: 165',
        bmi: 'IMC estimé:',
        menopauseStage: 'Stade de ménopause',
        stages: {
          pre: { label: 'Pré-ménopause', description: 'Cycles réguliers' },
          peri: { label: 'Périménopause', description: 'Cycles irréguliers, premiers symptômes' },
          meno: { label: 'Ménopause', description: 'Pas de règles depuis 12+ mois' },
          post: { label: 'Post-ménopause', description: 'Plusieurs années après' },
        },
      },
      
      // Step 2
      step2: {
        title: 'Historique médical',
        subtitle: 'Pour une personnalisation adaptée',
        contraception: 'Utilisez-vous une contraception hormonale ?',
        contraceptionPlaceholder: 'Précisez le type (ex: pilule, DIU...)',
        hrt: 'Avez-vous déjà pris un traitement hormonal substitutif (THS) ?',
        hrtPlaceholder: 'Précisez quand et lequel',
        menarcheAge: 'Âge de vos premières règles',
        menarcheAgePlaceholder: 'Ex: 13',
        conditions: 'Conditions médicales pertinentes',
        conditionsHelper: 'Sélectionnez tout ce qui s\'applique',
        conditionsOther: 'Précisez votre condition',
        yes: 'Oui',
        no: 'Non',
        medicalConditions: {
          cancer: 'Antécédents de cancer (sein, ovaires, utérus)',
          cardiovascular: 'Maladies cardiovasculaires',
          diabetes: 'Diabète ou troubles métaboliques',
          thyroid: 'Problèmes de thyroïde',
          osteoporosis: 'Ostéoporose ou fragilité osseuse',
          mental_health: 'Troubles de santé mentale (anxiété, dépression)',
          migraines: 'Migraines chroniques',
          none: 'Aucune condition',
        },
      },
      
      // Step 3
      step3: {
        title: 'Symptômes actuels',
        subtitle: 'Notez l\'intensité de 0 (absent) à 3 (sévère)',
        physical: 'Symptômes physiques',
        mental: 'Symptômes émotionnels / mentaux',
        cycle: 'Cycle menstruel',
        symptoms: {
          hot_flashes: 'Bouffées de chaleur / sueurs nocturnes',
          sleep_issues: 'Troubles du sommeil / insomnie',
          joint_pain: 'Douleurs articulaires / inflammation',
          fatigue: 'Fatigue chronique',
          weight_gain: 'Prise de poids / changements métaboliques',
          vaginal_dryness: 'Sécheresse vaginale',
          headaches: 'Maux de tête / migraines',
          anxiety: 'Anxiété',
          depression: 'Dépression / humeur basse',
          mood_swings: 'Sautes d\'humeur / irritabilité',
          brain_fog: 'Difficulté de concentration / brouillard mental',
          low_libido: 'Perte de libido',
          irregular_cycles: 'Cycles irréguliers',
          heavy_flow: 'Flux abondant',
          light_flow: 'Flux léger',
          spotting: 'Spotting entre les règles',
        },
      },
      
      // Step 4
      step4: {
        title: 'Vos objectifs',
        subtitle: 'Que recherchez-vous principalement ?',
        goals: {
          track_symptoms: 'Suivre et comprendre mes symptômes',
          prepare_appointments: 'Préparer mes rendez-vous médicaux',
          learn: 'Apprendre sur la ménopause et les traitements',
          manage_treatment: 'Gérer mon traitement hormonal (THS)',
          mental_wellbeing: 'Améliorer mon bien-être mental',
          lifestyle_tips: 'Recevoir des conseils lifestyle (alimentation, exercice)',
          community: 'Me connecter avec d\'autres femmes',
          track_medications: 'Suivre mes médicaments et suppléments',
        },
      },
      
      // Step 5
      step5: {
        title: 'Préférences',
        subtitle: 'Personnalisez votre expérience',
        notificationFrequency: 'Fréquence des rappels',
        notificationTiming: 'Moment préféré pour les notifications',
        notificationTypes: 'Type de notifications',
        medications: 'Médicaments actuels (optionnel)',
        medicationsPlaceholder: 'Listez vos médicaments',
        supplements: 'Suppléments (optionnel)',
        supplementsPlaceholder: 'Vitamine D, magnésium, etc.',
        device: 'Appareil connecté',
        syncData: 'Synchroniser les données',
        frequency: {
          daily: 'Quotidien',
          weekly: 'Hebdomadaire',
          monthly: 'Mensuel',
          never: 'Jamais',
        },
        timing: {
          morning: { label: 'Matin', time: '8h-10h' },
          noon: { label: 'Midi', time: '12h-14h' },
          evening: { label: 'Soir', time: '18h-20h' },
        },
        notifTypes: {
          symptoms: 'Rappels symptômes',
          tips: 'Conseils du jour',
          education: 'Contenu éducatif',
          health_alerts: 'Alertes santé',
        },
        devices: {
          apple_watch: 'Apple Watch',
          fitbit: 'Fitbit',
          oura: 'Oura',
          garmin: 'Garmin',
          other: 'Autre',
          none: 'Aucun',
        },
      },
      
      // Step 6
      step6: {
        title: 'Confidentialité',
        subtitle: 'Vos données en toute sécurité',
        privacyTitle: '🔒 Protection de vos données',
        privacyText: '• Chiffrement de bout en bout\n• Conformité RGPD\n• Aucune vente de données personnelles\n• Stockage sécurisé en Europe\n• Droit à l\'oubli respecté',
        consentData: 'J\'accepte la collecte et le traitement de mes données de santé pour personnaliser mon expérience',
        consentShare: 'J\'autorise le partage de mes données avec mes professionnels de santé (optionnel et révocable)',
        footer: 'En créant votre compte, vous acceptez nos Conditions d\'Utilisation et notre Politique de Confidentialité.',
      },
    },
    
    // Home Screen
    home: {
      hello: 'Bonjour',
      logout: 'Se déconnecter',
      logoutConfirm: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      cancel: 'Annuler',
      november: 'Novembre',
      symptoms: 'Symptômes',
      sleep: 'Sommeil',
      mood: 'Humeur',
    },
    
    // Common
    common: {
      error: 'Erreur',
      ok: 'OK',
      yes: 'Oui',
      no: 'Non',
    },
  },
  
  en: {
    // Landing Page
    landing: {
      title: 'Hélène',
      tagline: 'Your wellness companion',
      email: 'Email',
      password: 'Password',
      login: 'Log in',
      loggingIn: 'Logging in...',
      forgotPassword: 'Forgot password?',
      createAccount: 'Create account',
    },
    
    // Onboarding
    onboarding: {
      createAccount: 'Create account',
      step: 'Step',
      next: 'Next',
      start: 'Get started',
      creating: 'Creating account...',
      
      // Step 0
      step0: {
        title: 'Create your account',
        subtitle: 'Your credentials to access the app',
        email: 'Email',
        emailPlaceholder: 'your@email.com',
        password: 'Password',
        passwordPlaceholder: 'At least 6 characters',
        passwordHelper: 'Minimum 6 characters',
      },
      
      // Step 1
      step1: {
        title: 'Basic information',
        subtitle: 'To personalize your recommendations',
        age: 'Age',
        agePlaceholder: 'Ex: 48',
        weight: 'Weight (kg)',
        weightPlaceholder: 'Ex: 65',
        height: 'Height (cm)',
        heightPlaceholder: 'Ex: 165',
        bmi: 'Estimated BMI:',
        menopauseStage: 'Menopause stage',
        stages: {
          pre: { label: 'Pre-menopause', description: 'Regular cycles' },
          peri: { label: 'Perimenopause', description: 'Irregular cycles, first symptoms' },
          meno: { label: 'Menopause', description: 'No periods for 12+ months' },
          post: { label: 'Post-menopause', description: 'Several years after' },
        },
      },
      
      // Step 2
      step2: {
        title: 'Medical history',
        subtitle: 'For personalized care',
        contraception: 'Do you use hormonal contraception?',
        contraceptionPlaceholder: 'Specify type (e.g., pill, IUD...)',
        hrt: 'Have you taken hormone replacement therapy (HRT)?',
        hrtPlaceholder: 'Specify when and which one',
        menarcheAge: 'Age of first period',
        menarcheAgePlaceholder: 'Ex: 13',
        conditions: 'Relevant medical conditions',
        conditionsHelper: 'Select all that apply',
        conditionsOther: 'Specify your condition',
        yes: 'Yes',
        no: 'No',
        medicalConditions: {
          cancer: 'History of cancer (breast, ovarian, uterine)',
          cardiovascular: 'Cardiovascular diseases',
          diabetes: 'Diabetes or metabolic disorders',
          thyroid: 'Thyroid problems',
          osteoporosis: 'Osteoporosis or bone fragility',
          mental_health: 'Mental health issues (anxiety, depression)',
          migraines: 'Chronic migraines',
          none: 'No conditions',
        },
      },
      
      // Step 3
      step3: {
        title: 'Current symptoms',
        subtitle: 'Rate intensity from 0 (none) to 3 (severe)',
        physical: 'Physical symptoms',
        mental: 'Emotional / mental symptoms',
        cycle: 'Menstrual cycle',
        symptoms: {
          hot_flashes: 'Hot flashes / night sweats',
          sleep_issues: 'Sleep problems / insomnia',
          joint_pain: 'Joint pain / inflammation',
          fatigue: 'Chronic fatigue',
          weight_gain: 'Weight gain / metabolic changes',
          vaginal_dryness: 'Vaginal dryness',
          headaches: 'Headaches / migraines',
          anxiety: 'Anxiety',
          depression: 'Depression / low mood',
          mood_swings: 'Mood swings / irritability',
          brain_fog: 'Difficulty concentrating / brain fog',
          low_libido: 'Loss of libido',
          irregular_cycles: 'Irregular cycles',
          heavy_flow: 'Heavy flow',
          light_flow: 'Light flow',
          spotting: 'Spotting between periods',
        },
      },
      
      // Step 4
      step4: {
        title: 'Your goals',
        subtitle: 'What are you looking for?',
        goals: {
          track_symptoms: 'Track and understand my symptoms',
          prepare_appointments: 'Prepare medical appointments',
          learn: 'Learn about menopause and treatments',
          manage_treatment: 'Manage my hormone therapy (HRT)',
          mental_wellbeing: 'Improve my mental well-being',
          lifestyle_tips: 'Get lifestyle tips (nutrition, exercise)',
          community: 'Connect with other women',
          track_medications: 'Track medications and supplements',
        },
      },
      
      // Step 5
      step5: {
        title: 'Preferences',
        subtitle: 'Customize your experience',
        notificationFrequency: 'Reminder frequency',
        notificationTiming: 'Preferred time for notifications',
        notificationTypes: 'Notification types',
        medications: 'Current medications (optional)',
        medicationsPlaceholder: 'List your medications',
        supplements: 'Supplements (optional)',
        supplementsPlaceholder: 'Vitamin D, magnesium, etc.',
        device: 'Connected device',
        syncData: 'Sync data',
        frequency: {
          daily: 'Daily',
          weekly: 'Weekly',
          monthly: 'Monthly',
          never: 'Never',
        },
        timing: {
          morning: { label: 'Morning', time: '8am-10am' },
          noon: { label: 'Noon', time: '12pm-2pm' },
          evening: { label: 'Evening', time: '6pm-8pm' },
        },
        notifTypes: {
          symptoms: 'Symptom reminders',
          tips: 'Daily tips',
          education: 'Educational content',
          health_alerts: 'Health alerts',
        },
        devices: {
          apple_watch: 'Apple Watch',
          fitbit: 'Fitbit',
          oura: 'Oura',
          garmin: 'Garmin',
          other: 'Other',
          none: 'None',
        },
      },
      
      // Step 6
      step6: {
        title: 'Privacy',
        subtitle: 'Your data is secure',
        privacyTitle: '🔒 Data protection',
        privacyText: '• End-to-end encryption\n• GDPR compliant\n• No selling of personal data\n• Secure storage in Europe\n• Right to be forgotten',
        consentData: 'I agree to the collection and processing of my health data to personalize my experience',
        consentShare: 'I authorize sharing my data with my healthcare providers (optional and revocable)',
        footer: 'By creating your account, you agree to our Terms of Service and Privacy Policy.',
      },
    },
    
    // Home Screen
    home: {
      hello: 'Hello',
      logout: 'Log out',
      logoutConfirm: 'Are you sure you want to log out?',
      cancel: 'Cancel',
      november: 'November',
      symptoms: 'Symptoms',
      sleep: 'Sleep',
      mood: 'Mood',
    },
    
    // Common
    common: {
      error: 'Error',
      ok: 'OK',
      yes: 'Yes',
      no: 'No',
    },
  },
};

export const getTranslation = (lang = 'en') => {
  return translations[lang] || translations.en;
};
