# Configuration Supabase pour Hélène

## 🚀 Étapes de configuration

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New Project"
4. Remplissez les informations :
   - **Name**: Helene
   - **Database Password**: (choisissez un mot de passe fort)
   - **Region**: Europe (West) - Paris
5. Cliquez sur "Create new project"

### 2. Obtenir vos clés API

1. Dans votre projet, allez dans **Settings** (engrenage en bas à gauche)
2. Cliquez sur **API**
3. Copiez les valeurs suivantes :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon/public key** (la clé `anon public`)

### 3. Configurer le fichier supabase.js

1. Ouvrez le fichier `/src/lib/supabase.js`
2. Remplacez `YOUR_SUPABASE_URL` par votre Project URL
3. Remplacez `YOUR_SUPABASE_ANON_KEY` par votre clé anon/public

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...votre-clé-ici';
```

### 4. Créer la table dans la base de données

1. Dans Supabase, allez dans **SQL Editor**
2. Cliquez sur "New query"
3. Copiez-collez le contenu du fichier `supabase-schema.sql`
4. Cliquez sur "Run" (ou Ctrl+Enter)

⚠️ **Si vous aviez déjà créé la table**, exécutez cette commande pour corriger les policies :

```sql
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Recréer les policies correctes
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" 
  ON profiles FOR DELETE 
  USING (auth.uid() = id);
```

### 5. Activer l'authentification Email

1. Allez dans **Authentication** > **Providers**
2. Activez "Email" si ce n'est pas déjà fait
3. Configurez les paramètres :
   - ✅ Enable email confirmations (optionnel)
   - ✅ Secure email change
   - ✅ Secure password change

### 6. (Optionnel) Configurer Apple & Google Auth

#### Google Sign In:
1. **Authentication** > **Providers** > **Google**
2. Créez un projet dans [Google Cloud Console](https://console.cloud.google.com)
3. Configurez OAuth 2.0
4. Copiez Client ID et Client Secret

**Pour le Bundle ID / Package Name :**
- **iOS** : Utilisez le `bundleIdentifier` de votre `app.json` → `com.helene.app`
- **Android** : Utilisez le `package` dans votre config → `com.helene.app`

**Note** : Le Bundle ID est l'identifiant unique de votre application. Pour cette app Hélène, c'est : `com.helene.app` (défini dans `app.json`)

#### Apple Sign In:

## 📊 Structure de la base de données

### Table: `profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | ID de l'utilisateur (référence auth.users) |
| `name` | TEXT | Prénom de l'utilisatrice |
| `birth_year` | INTEGER | Année de naissance |
| `menopause_stage` | TEXT | Stade: 'peri', 'meno', 'post', 'unsure' |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de modification |

## 🔒 Sécurité (Row Level Security)

- ✅ Chaque utilisatrice ne peut voir que son propre profil
- ✅ Chaque utilisatrice ne peut modifier que ses propres données
- ✅ Les données sont automatiquement liées à l'authentification

## 🧪 Test

1. Lancez l'app : `npm start`
2. Créez un compte via l'écran d'inscription
3. Vérifiez dans Supabase :
   - **Authentication** > **Users** : l'utilisateur doit apparaître
   - **Table Editor** > **profiles** : le profil doit être créé

## 📝 Notes

- Les mots de passe sont automatiquement hashés par Supabase
- L'email de confirmation peut être configuré dans les paramètres
- Les tokens d'authentification sont gérés automatiquement
- La session persiste même après fermeture de l'app
