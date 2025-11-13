import * as Linking from 'expo-linking';

export const setupDeepLinking = (supabase) => {
  // Écouter les deep links
  Linking.addEventListener('url', async ({ url }) => {
    console.log('Deep link reçu:', url);
    
    if (url) {
      // Extraire les paramètres de l'URL
      const { queryParams } = Linking.parse(url);
      
      if (queryParams) {
        // Si c'est un callback OAuth
        if (queryParams.access_token || queryParams.refresh_token) {
          console.log('Tokens OAuth détectés');
          
          // Supabase va automatiquement gérer la session
          const { data, error } = await supabase.auth.setSession({
            access_token: queryParams.access_token,
            refresh_token: queryParams.refresh_token,
          });
          
          if (error) {
            console.error('Erreur lors de la configuration de la session:', error);
          } else {
            console.log('Session configurée avec succès:', data);
          }
        }
      }
    }
  });
};

export const prefix = Linking.createURL('/');
