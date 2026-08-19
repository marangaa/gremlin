import { ORGANISM_MODELS, type OrganismId } from '../personalities/types';

export function getOrganismSvg(id: OrganismId): string {
  const model = ORGANISM_MODELS[id] || ORGANISM_MODELS.nexus;

  switch (id) {
    case 'cipher':
      return getCipherSvg(model.accentColor, model.secondaryColor);
    case 'aero':
      return getAeroSvg(model.accentColor, model.secondaryColor);
    case 'kuro':
      return getKuroSvg(model.accentColor, model.secondaryColor);
    case 'atlas':
      return getAtlasSvg(model.accentColor, model.secondaryColor);
    case 'nexus':
    default:
      return getNexusSvg(model.accentColor, model.secondaryColor);
  }
}

// 1. NEXUS-01 (Cybernetic AI Core)
function getNexusSvg(accent: string, secondary: string): string {
  return /* html */ `
  <svg class="organism-svg nexus-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="nexus-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <linearGradient id="nexus-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}" />
        <stop offset="100%" stop-color="${secondary}" />
      </linearGradient>
    </defs>

    <!-- Outer Orbital Ring -->
    <circle class="org-orbital org-orbital-1" cx="50" cy="50" r="38" stroke="${accent}" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.6" />
    <circle class="org-orbital org-orbital-2" cx="50" cy="50" r="32" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="14 10" opacity="0.75" />

    <!-- Satellite Nodes -->
    <circle class="org-node org-node-l" cx="16" cy="50" r="3" fill="${accent}" filter="url(#nexus-glow)" />
    <circle class="org-node org-node-r" cx="84" cy="50" r="3" fill="${secondary}" filter="url(#nexus-glow)" />

    <!-- Core Chassis -->
    <rect class="org-core-chassis" x="28" y="28" width="44" height="44" rx="14" fill="#090d16" stroke="${accent}" stroke-width="2.5" />

    <!-- Digital Visor Display -->
    <rect class="org-visor" x="33" y="38" width="34" height="18" rx="6" fill="#030712" stroke="rgba(255,255,255,0.15)" stroke-width="1" />

    <!-- Eyes / Optical Scanners -->
    <g class="org-eyes-open">
      <ellipse class="org-eye org-eye-l" cx="43" cy="47" rx="4.5" ry="5.5" fill="${accent}" filter="url(#nexus-glow)" />
      <ellipse class="org-eye org-eye-r" cx="57" cy="47" rx="4.5" ry="5.5" fill="${accent}" filter="url(#nexus-glow)" />
      <!-- Pupil Gaze Trackers -->
      <g class="org-pupils">
        <circle class="org-pupil" cx="43" cy="47" r="2.5" fill="#ffffff" />
        <circle class="org-pupil" cx="57" cy="47" r="2.5" fill="#ffffff" />
      </g>
    </g>

    <!-- Eyes Closed / Standby Mode -->
    <g class="org-eyes-closed">
      <line x1="39" y1="47" x2="47" y2="47" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" />
      <line x1="53" y1="47" x2="61" y2="47" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" />
    </g>

    <!-- Telemetry Pulse Wave -->
    <path class="org-telemetry" d="M36 62 Q43 59 50 62 T64 62" stroke="${accent}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.8" />
  </svg>
  `;
}

// 2. CIPHER (Noir Investigator)
function getCipherSvg(accent: string, _secondary: string): string {
  return /* html */ `
  <svg class="organism-svg cipher-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Cloak / Silhouette -->
    <ellipse cx="50" cy="66" rx="26" ry="20" fill="#0f172a" stroke="#334155" stroke-width="2" />
    <path d="M34 68 L50 56 L66 68 L50 82 Z" fill="#1e293b" stroke="#475569" stroke-width="1.5" />

    <!-- Head -->
    <circle cx="50" cy="46" r="18" fill="#0f172a" stroke="#334155" stroke-width="2" />

    <!-- Noir Hat -->
    <g class="org-hat">
      <ellipse cx="50" cy="38" rx="28" ry="6" fill="#090d16" stroke="#334155" stroke-width="2" />
      <path d="M32 37 C32 24 38 18 50 18 C62 18 68 24 68 37 Z" fill="#1e293b" stroke="#334155" stroke-width="2" />
      <rect x="33" y="32" width="34" height="4" fill="${accent}" />
    </g>

    <!-- Glowing Monocle / Scanner Eye -->
    <g class="org-eyes-open">
      <!-- Left Eye: Amber Scanner Lens -->
      <circle cx="42" cy="46" r="6" fill="#090d16" stroke="${accent}" stroke-width="2" />
      <circle class="org-pupil" cx="42" cy="46" r="3" fill="${accent}" />
      <circle cx="41" cy="44.5" r="1" fill="#ffffff" />

      <!-- Right Eye: Subtle Glint -->
      <circle cx="58" cy="46" r="4.5" fill="#090d16" stroke="#64748b" stroke-width="1.5" />
      <circle class="org-pupil" cx="58" cy="46" r="2" fill="${accent}" opacity="0.8" />
    </g>

    <!-- Eyes Closed -->
    <g class="org-eyes-closed">
      <line x1="37" y1="46" x2="47" y2="46" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
      <line x1="53" y1="46" x2="63" y2="46" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
    </g>
  </svg>
  `;
}

// 3. AERO (Ethereal Wisp)
function getAeroSvg(accent: string, secondary: string): string {
  return /* html */ `
  <svg class="organism-svg aero-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="aero-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Ambient Aura -->
    <ellipse class="org-aura" cx="50" cy="52" rx="30" ry="26" fill="${secondary}" opacity="0.25" filter="url(#aero-glow)" />

    <!-- Ethereal Body -->
    <path class="org-wisp-body" d="M50 24 C34 24 26 38 28 56 C30 68 42 78 50 82 C58 78 70 68 72 56 C74 38 66 24 50 24 Z" fill="${accent}" opacity="0.85" stroke="#ffffff" stroke-width="1.5" />

    <!-- Luminous Eyes -->
    <g class="org-eyes-open">
      <ellipse cx="42" cy="48" rx="4.5" ry="6" fill="#090d16" />
      <ellipse cx="58" cy="48" rx="4.5" ry="6" fill="#090d16" />
      <circle class="org-pupil" cx="42" cy="47" r="2.5" fill="#ffffff" filter="url(#aero-glow)" />
      <circle class="org-pupil" cx="58" cy="47" r="2.5" fill="#ffffff" filter="url(#aero-glow)" />
    </g>

    <!-- Eyes Closed -->
    <g class="org-eyes-closed">
      <path d="M37 49 Q42 53 47 49" stroke="#090d16" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M53 49 Q58 53 63 49" stroke="#090d16" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>

    <!-- Sprout / Floating Crest -->
    <path d="M50 24 Q50 14 44 12 Q42 18 50 20" fill="#34d399" stroke="#ffffff" stroke-width="1" />
  </svg>
  `;
}

// 4. KURO (Shadow Gremlin)
function getKuroSvg(accent: string, _secondary: string): string {
  return /* html */ `
  <svg class="organism-svg kuro-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="kuro-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Horns -->
    <path class="org-horn-l" d="M36 34 L22 18 L30 38 Z" fill="${accent}" stroke="#090d16" stroke-width="2" />
    <path class="org-horn-r" d="M64 34 L78 18 L70 38 Z" fill="${accent}" stroke="#090d16" stroke-width="2" />

    <!-- Dark Matter Body -->
    <ellipse cx="50" cy="56" rx="28" ry="24" fill="#090d16" stroke="${accent}" stroke-width="2.5" />

    <!-- Glowing Cyber Eyes -->
    <g class="org-eyes-open">
      <path d="M32 46 Q42 42 46 50 Q38 54 32 46 Z" fill="${accent}" filter="url(#kuro-glow)" />
      <path d="M68 46 Q58 42 54 50 Q62 54 68 46 Z" fill="${accent}" filter="url(#kuro-glow)" />
      <circle class="org-pupil" cx="40" cy="47" r="2.5" fill="#ffffff" />
      <circle class="org-pupil" cx="60" cy="47" r="2.5" fill="#ffffff" />
    </g>

    <!-- Eyes Closed -->
    <g class="org-eyes-closed">
      <path d="M34 50 L44 48" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" />
      <path d="M66 50 L56 48" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" />
    </g>

    <!-- Fangs -->
    <g class="org-fangs">
      <polygon points="44,60 46,65 48,60" fill="#ffffff" />
      <polygon points="52,60 54,65 56,60" fill="#ffffff" />
    </g>
  </svg>
  `;
}

// 5. ATLAS (Executive Automaton)
function getAtlasSvg(accent: string, secondary: string): string {
  return /* html */ `
  <svg class="organism-svg atlas-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Automaton Chassis -->
    <rect x="26" y="30" width="48" height="46" rx="10" fill="#0f172a" stroke="${secondary}" stroke-width="2" />

    <!-- Shoulder Pauldrons -->
    <rect x="18" y="44" width="10" height="18" rx="4" fill="#1e293b" stroke="${secondary}" stroke-width="1.5" />
    <rect x="72" y="44" width="10" height="18" rx="4" fill="#1e293b" stroke="${secondary}" stroke-width="1.5" />

    <!-- Reactor Lens Center -->
    <circle cx="50" cy="62" r="6" fill="${accent}" stroke="#ffffff" stroke-width="1.5" opacity="0.9" />

    <!-- Optical HUD Visor -->
    <rect x="32" y="38" width="36" height="14" rx="4" fill="#030712" stroke="${accent}" stroke-width="1.5" />

    <!-- Visor Scan Lines -->
    <g class="org-eyes-open">
      <rect class="org-pupil" x="38" y="42" width="10" height="6" rx="2" fill="${accent}" />
      <rect class="org-pupil" x="52" y="42" width="10" height="6" rx="2" fill="${accent}" />
    </g>

    <g class="org-eyes-closed">
      <line x1="36" y1="45" x2="64" y2="45" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity="0.6" />
    </g>
  </svg>
  `;
}
