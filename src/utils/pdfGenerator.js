/**
 * Générateur de rapport PDF pour médecin
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { calculateMenqolScore } from './menqolCalculator';

export const generateDoctorReport = async (userData, logs, insights) => {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Calculer les statistiques
  const avgMood = (logs.reduce((sum, log) => sum + (log.mood || 0), 0) / logs.length).toFixed(1);
  const avgSleep = (logs.reduce((sum, log) => sum + (log.sleep_quality || 0), 0) / logs.length).toFixed(1);
  const avgEnergy = (logs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / logs.length).toFixed(1);

  // Compteur de symptômes
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

  const symptoms = Object.keys(symptomLabels);
  const symptomCounts = {};
  symptoms.forEach(symptom => {
    const count = logs.filter(log => log[symptom] && log[symptom] > 0).length;
    if (count > 0) {
      symptomCounts[symptom] = {
        count,
        percentage: ((count / logs.length) * 100).toFixed(0),
      };
    }
  });

  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Calculer le score MENQOL
  const menqolScore = calculateMenqolScore(logs);

  // Générer le HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rapport Helene</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1F1F1F;
          padding: 40px;
          line-height: 1.6;
        }
        .header {
          border-bottom: 3px solid #E83E73;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: 300;
          font-style: italic;
          color: #E83E73;
          margin-bottom: 5px;
        }
        .subtitle {
          font-size: 14px;
          color: #6B7280;
        }
        .patient-info {
          background: #FAFAF9;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
        }
        .patient-info h2 {
          font-size: 18px;
          margin-bottom: 15px;
          color: #E83E73;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #1F1F1F;
        }
        .section {
          margin-bottom: 35px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 300;
          font-style: italic;
          color: #1F1F1F;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #E2E8F0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 300;
          color: #E83E73;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .symptoms-list {
          list-style: none;
        }
        .symptom-item {
          background: white;
          border: 1px solid #E2E8F0;
          border-left: 3px solid #F59E0B;
          border-radius: 6px;
          padding: 12px 15px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .symptom-name {
          font-weight: 500;
          color: #1F1F1F;
        }
        .symptom-stats {
          font-size: 14px;
          color: #6B7280;
        }
        .insights-section {
          background: #FCECEF;
          border-radius: 12px;
          padding: 20px;
        }
        .insight-item {
          background: white;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          border-left: 3px solid #E83E73;
        }
        .insight-title {
          font-weight: 600;
          color: #1F1F1F;
          margin-bottom: 5px;
        }
        .insight-message {
          font-size: 14px;
          color: #4A5568;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E2E8F0;
          font-size: 12px;
          color: #9CA3AF;
          text-align: center;
        }
        .notes-section {
          background: #FFFBEB;
          border: 1px dashed #F59E0B;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        .notes-title {
          font-weight: 600;
          color: #D97706;
          margin-bottom: 10px;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="logo">Helene</div>
        <div class="subtitle">Rapport de suivi - Période du ${new Date(logs[logs.length - 1].log_date).toLocaleDateString('fr-FR')} au ${new Date(logs[0].log_date).toLocaleDateString('fr-FR')}</div>
      </div>

      <!-- Patient Info -->
      <div class="patient-info">
        <h2>Informations patiente</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Date du rapport</div>
            <div class="info-value">${today}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Période analysée</div>
            <div class="info-value">${logs.length} jours</div>
          </div>
          <div class="info-item">
            <div class="info-label">Âge</div>
            <div class="info-value">${userData.age || 'Non renseigné'} ans</div>
          </div>
          <div class="info-item">
            <div class="info-label">Stade</div>
            <div class="info-value">${
              userData.menopause_stage === 'peri' ? 'Périménopause' :
              userData.menopause_stage === 'meno' ? 'Ménopause' :
              userData.menopause_stage === 'post' ? 'Post-ménopause' :
              'Non renseigné'
            }</div>
          </div>
        </div>
      </div>

      <!-- Statistics Section -->
      <div class="section">
        <div class="section-title">Statistiques moyennes</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${avgMood}<span style="font-size: 16px; color: #6B7280;">/5</span></div>
            <div class="stat-label">Humeur moyenne</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${avgSleep}<span style="font-size: 16px; color: #6B7280;">/10</span></div>
            <div class="stat-label">Qualité du sommeil</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${avgEnergy}<span style="font-size: 16px; color: #6B7280;">/5</span></div>
            <div class="stat-label">Niveau d'énergie</div>
          </div>
        </div>
      </div>

      <!-- MENQOL Score Section -->
      ${menqolScore && menqolScore.globalScore > 0 ? `
        <div class="section">
          <div class="section-title">Score MENQOL (Menopause-Specific Quality of Life)</div>
          <div style="background: #F0FDF4; border-left: 4px solid #10B981; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: baseline; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 56px; font-weight: 300; color: #E83E73; letter-spacing: -2px;">${menqolScore.globalScore}</span>
              <span style="font-size: 24px; color: #6B7280; margin-left: 5px;">/8</span>
            </div>
            <p style="text-align: center; font-size: 16px; color: #1F1F1F; margin-bottom: 20px;">
              ${menqolScore.interpretation}
            </p>
            
            <div style="background: white; border-radius: 8px; padding: 15px;">
              <p style="font-size: 13px; color: #6B7280; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                Détail par domaine
              </p>
              ${Object.entries(menqolScore.domains)
                .filter(([_, data]) => data.score > 0)
                .map(([domain, data]) => {
                  const labels = {
                    vasomotor: 'Vasomoteur (bouffées, sueurs)',
                    psychosocial: 'Psychosocial (humeur, anxiété, mémoire)',
                    physical: 'Physique (fatigue, douleurs, sommeil)',
                    sexual: 'Sexuel (libido, confort)',
                  };
                  const severityLabels = {
                    mild: 'Léger',
                    moderate: 'Modéré',
                    severe: 'Sévère',
                    very_severe: 'Très sévère',
                  };
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #E2E8F0;">
                      <span style="font-size: 14px; color: #1F1F1F; flex: 1;">${labels[domain]}</span>
                      <span style="font-size: 14px; font-weight: 600; color: ${data.severity === 'mild' ? '#10B981' : data.severity === 'moderate' ? '#F59E0B' : '#EF4444'};">
                        ${data.score}/8 (${severityLabels[data.severity]})
                      </span>
                    </div>
                  `;
                }).join('')}
            </div>

            <div style="background: #FCECEF; border-radius: 8px; padding: 15px; margin-top: 15px;">
              <p style="font-size: 13px; color: #1F1F1F; line-height: 1.6;">
                <strong>Recommandation:</strong> ${menqolScore.recommendation}
              </p>
            </div>

            <p style="font-size: 11px; color: #9CA3AF; margin-top: 15px; text-align: center; line-height: 1.5;">
              Le score MENQOL est un questionnaire standardisé validé scientifiquement pour évaluer 
              l'impact de la ménopause sur la qualité de vie. Score calculé automatiquement sur ${logs.length} jours.
            </p>
          </div>
        </div>
      ` : ''}

      <!-- Symptoms Section -->
      ${topSymptoms.length > 0 ? `
        <div class="section">
          <div class="section-title">Symptômes principaux</div>
          <ul class="symptoms-list">
            ${topSymptoms.map(([symptom, data]) => `
              <li class="symptom-item">
                <span class="symptom-name">${symptomLabels[symptom]}</span>
                <span class="symptom-stats">${data.count} jours (${data.percentage}%)</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Insights Section -->
      ${insights && insights.length > 0 ? `
        <div class="section">
          <div class="section-title">Observations clés</div>
          <div class="insights-section">
            ${insights.slice(0, 4).map(insight => `
              <div class="insight-item">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-message">${insight.message}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Notes Section -->
      <div class="notes-section">
        <div class="notes-title">📝 Notes pour la consultation</div>
        <p style="font-size: 14px; color: #92400E; line-height: 1.8;">
          Ce rapport présente un résumé des données auto-rapportées par la patiente via l'application Helene. 
          Les informations sont basées sur un suivi quotidien des symptômes, de l'humeur et du sommeil. 
          Ce document est destiné à faciliter la discussion lors de la consultation médicale.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document généré par Helene • Application de suivi menopause</p>
        <p style="margin-top: 5px;">Les données présentées sont auto-rapportées et ne remplacent pas un diagnostic médical</p>
      </div>
    </body>
    </html>
  `;

  try {
    // Générer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('PDF généré:', uri);

    // Partager le PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager le rapport médical',
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Le partage n\'est pas disponible sur cet appareil');
    }

    return { success: true, uri };
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
};
