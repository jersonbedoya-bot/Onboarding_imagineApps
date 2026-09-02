/**
 * ==========================================================================
 * IMAGINE APPS ONBOARDING - CORE APPLICATION ENGINE (app.js)
 * Vanilla JS Modular State Management & Micro-interactions
 * ==========================================================================
 */

const ImagineApp = (() => {
  const STORAGE_KEY = 'imagine_onboarding_state_v1';

  // Estado por defecto del Onboarding
  const defaultState = {
    currentStep: 0,
    totalSteps: 4,
    selectedRole: 'pdm', // 'pdm' | 'uxui' | null
    completedActivities: {
      step0_quiz: false,
      step0_videos: [],
      step1_challenge: false,
      step2_scenario: false,
      step3_simulation: false,
      step4_policyCheck: false,
    },
    roleConfirmed: false
  };

  // Cargar estado desde localStorage
  let state = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : { ...defaultState };
    } catch (e) {
      console.warn('Storage unavailable, using in-memory state', e);
      return { ...defaultState };
    }
  })();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  // Cálculo de progreso general
  function calculateProgress() {
    let score = 0;
    const maxScore = 7;

    // Paso 0: Quiz ADN (1 pt) + Videos de liderazgo (1 pt)
    if (state.completedActivities.step0_quiz) score += 1;
    if (state.completedActivities.step0_videos && state.completedActivities.step0_videos.length >= 2) score += 1;
    
    // Paso 1: Rol y reto (2 pts)
    if (state.roleConfirmed) score += 1;
    if (state.completedActivities.step1_challenge) score += 1;

    // Pasos 2, 3, 4 (1 pt cada uno)
    if (state.completedActivities.step2_scenario) score += 1;
    if (state.completedActivities.step3_simulation) score += 1;
    if (state.completedActivities.step4_policyCheck) score += 1;

    const percent = Math.min(100, Math.round((score / maxScore) * 100));
    return percent;
  }

  // Actualizar UI del Topbar en cualquier página
  function renderGlobalProgress() {
    const fillEl = document.getElementById('global-progress-fill');
    const numEl = document.getElementById('global-progress-num');
    const roleBadgeEl = document.getElementById('global-role-badge');

    const percent = calculateProgress();

    if (fillEl) fillEl.style.width = `${percent}%`;
    if (numEl) numEl.textContent = `${percent}%`;

    if (roleBadgeEl) {
      if (state.selectedRole === 'pdm') {
        roleBadgeEl.textContent = 'Track: PDM';
        roleBadgeEl.className = 'role-badge badge-pdm';
      } else if (state.selectedRole === 'uxui') {
        roleBadgeEl.textContent = 'Track: UX/UI';
        roleBadgeEl.className = 'role-badge badge-uxui';
      } else {
        roleBadgeEl.textContent = 'Track Común';
        roleBadgeEl.className = 'role-badge badge-common';
      }
    }
  }

  return {
    getState: () => ({ ...state }),
    setRole: (role) => {
      state.selectedRole = role;
      state.roleConfirmed = true;
      saveState();
      renderGlobalProgress();
    },
    markActivityDone: (activityKey, value = true) => {
      if (activityKey === 'video') {
        if (!state.completedActivities.step0_videos.includes(value)) {
          state.completedActivities.step0_videos.push(value);
        }
      } else {
        state.completedActivities[activityKey] = value;
      }
      saveState();
      renderGlobalProgress();
    },
    init: () => {
      renderGlobalProgress();
    }
  };
})();

// Inicialización automática cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  ImagineApp.init();
});
