// Lens configuration catalogue.
// Every option has a priceDelta (in ZAR).
// 'overlay' on a tint option is the semi-transparent colour applied to the
// product photo as a preview. null means no overlay.
// 'help' on a group supplies the education modal content (title + body).
//
// This file is the single source of truth for prices, labels, and defaults.

export const LENS_GROUPS = [
  {
    id: 'lensType',
    label: 'Lens type',
    appliesTo: ['optical_frame', 'lenses'],
    help: {
      title: 'What is lens type?',
      body:
        'Your prescription type. Single vision corrects one viewing distance (most common). ' +
        'Reading helps up close. Bifocal and progressive correct multiple distances in one lens.',
    },
    options: [
      { id: 'plano',       label: 'Plano (no prescription)', priceDelta: 0 },
      { id: 'single',      label: 'Single vision',           priceDelta: 400 },
      { id: 'reading',     label: 'Reading',                 priceDelta: 350 },
      { id: 'bifocal',     label: 'Bifocal',                 priceDelta: 700 },
      { id: 'progressive', label: 'Progressive',             priceDelta: 1200 },
    ],
  },
  {
    id: 'lensIndex',
    label: 'Lens index',
    appliesTo: ['optical_frame', 'lenses'],
    help: {
      title: 'What is lens index?',
      body:
        'Higher index = thinner, lighter lens. Choose 1.56 for light prescriptions, 1.61 for medium, ' +
        '1.67 for strong, 1.74 for very strong. The wizard recommends the best fit once your ' +
        'prescription is entered.',
    },
    options: [
      { id: '1.50', label: '1.50 — Standard',   priceDelta: 0 },
      { id: '1.56', label: '1.56 — Mid-index',  priceDelta: 200 },
      { id: '1.61', label: '1.61 — Thin',       priceDelta: 400 },
      { id: '1.67', label: '1.67 — Very thin',  priceDelta: 800 },
      { id: '1.74', label: '1.74 — Ultra-thin', priceDelta: 1400 },
    ],
  },
  {
    id: 'edgeThickness',
    label: 'Edge finish',
    appliesTo: ['optical_frame', 'lenses'],
    help: {
      title: 'What is edge finish?',
      body:
        'Standard edge is the plain cut. Thin and ultra-thin edge are polished thinner for a ' +
        'lighter feel and better aesthetics on strong prescriptions.',
    },
    options: [
      { id: 'standard', label: 'Standard edge',   priceDelta: 0 },
      { id: 'thin',     label: 'Thin edge',       priceDelta: 150 },
      { id: 'ultra',    label: 'Ultra-thin edge', priceDelta: 300 },
    ],
  },
  {
    id: 'progressiveStyle',
    label: 'Progressive style',
    appliesTo: ['optical_frame', 'lenses'],
    help: {
      title: 'Progressive styles',
      body:
        'Only relevant if you chose Progressive above. Standard gives a classic corridor. ' +
        'Premium widens it. Digital freeform is fully individualised to your vision pattern.',
    },
    options: [
      { id: 'standard', label: 'Standard progressive', priceDelta: 0 },
      { id: 'premium',  label: 'Premium progressive',  priceDelta: 500 },
      { id: 'digital',  label: 'Digital freeform',     priceDelta: 1000 },
    ],
  },
  {
    id: 'tint',
    label: 'Tint',
    appliesTo: ['optical_frame', 'lenses', 'sunglasses'],
    help: {
      title: 'Lens tints',
      body:
        'Clear is fully transparent. Grey reduces glare neutrally. Brown warms colours and is ' +
        'great for driving. Green is calm and natural. Rose improves contrast. Blue mirror is ' +
        'reflective and dramatic. Gradient fades from dark to light. Photochromic darkens ' +
        'automatically in sunlight.',
    },
    options: [
      { id: 'clear',        label: 'Clear',        priceDelta: 0,   overlay: null },
      { id: 'grey',         label: 'Grey',         priceDelta: 100, overlay: 'rgba(55,55,55,0.38)' },
      { id: 'brown',        label: 'Brown',        priceDelta: 100, overlay: 'rgba(120,70,30,0.35)' },
      { id: 'green',        label: 'Green',        priceDelta: 100, overlay: 'rgba(30,90,60,0.32)' },
      { id: 'rose',         label: 'Rose',         priceDelta: 120, overlay: 'rgba(200,100,120,0.30)' },
      { id: 'blue_mirror',  label: 'Blue mirror',  priceDelta: 250, overlay: 'rgba(60,120,200,0.42)' },
      { id: 'gradient',     label: 'Gradient',     priceDelta: 200, overlay: 'rgba(50,50,50,0.42)' },
      { id: 'photochromic', label: 'Photochromic', priceDelta: 800, overlay: 'rgba(80,80,80,0.22)' },
    ],
  },
  {
    id: 'polarization',
    label: 'Polarization',
    appliesTo: ['sunglasses'],
    help: {
      title: 'Polarized lenses',
      body:
        'Polarized lenses block horizontal light glare from water, snow, roads, and glass. ' +
        'Excellent for driving, fishing, and the beach. Slightly darker look indoors.',
    },
    options: [
      { id: 'no',  label: 'Not polarized', priceDelta: 0 },
      { id: 'yes', label: 'Polarized',     priceDelta: 350 },
    ],
  },
  {
    id: 'coating',
    label: 'Coating',
    appliesTo: ['optical_frame', 'lenses', 'sunglasses'],
    help: {
      title: 'Lens coatings',
      body:
        'Anti-reflective reduces glare from screens and lights. Blue-light filter reduces ' +
        'blue-spectrum exposure from devices. AR + blue-light combines both. Scratch-resistant ' +
        'is a hard protective layer.',
    },
    options: [
      { id: 'none',    label: 'None',              priceDelta: 0 },
      { id: 'ar',      label: 'Anti-reflective',   priceDelta: 250 },
      { id: 'blue',    label: 'Blue-light filter', priceDelta: 400 },
      { id: 'ar_blue', label: 'AR + blue-light',   priceDelta: 550 },
      { id: 'scratch', label: 'Scratch-resistant', priceDelta: 200 },
    ],
  },
  {
    id: 'contactSchedule',
    label: 'Wearing schedule',
    appliesTo: ['contact_lenses'],
    help: {
      title: 'Contact lens schedule',
      body:
        'How often you replace your lenses. Daily disposables are the healthiest. ' +
        'Bi-weekly and monthly are more economical.',
    },
    options: [
      { id: 'daily',    label: 'Daily disposable', priceDelta: 0 },
      { id: 'biweekly', label: 'Bi-weekly',        priceDelta: 0 },
      { id: 'monthly',  label: 'Monthly',          priceDelta: 0 },
    ],
  },
  {
    id: 'contactType',
    label: 'Lens correction',
    appliesTo: ['contact_lenses'],
    help: {
      title: 'Contact lens correction',
      body:
        'Sphere corrects basic short- or long-sightedness. Toric corrects astigmatism. ' +
        'Multifocal works like progressive lenses in a contact.',
    },
    options: [
      { id: 'sphere',     label: 'Sphere',              priceDelta: 0 },
      { id: 'toric',      label: 'Toric (astigmatism)', priceDelta: 200 },
      { id: 'multifocal', label: 'Multifocal',          priceDelta: 400 },
    ],
  },
  {
    id: 'accessoryFinish',
    label: 'Finish',
    appliesTo: ['accessory'],
    options: [
      { id: 'standard', label: 'Standard',     priceDelta: 0 },
      { id: 'premium',  label: 'Premium',      priceDelta: 100 },
      { id: 'gift',     label: 'Gift wrapped', priceDelta: 150 },
    ],
  },
];

// Activities pre-select sensible usage and upgrades when chosen in the wizard.
// The `suggested` object is merged on top of the current config.
export const ACTIVITIES = [
  {
    id: 'everyday',
    label: 'Everyday wear',
    description: 'General day-to-day vision.',
    suggested: { lensType: 'single', tint: 'clear', coating: 'ar' },
  },
  {
    id: 'driving',
    label: 'Driving',
    description: 'Glare from roads, glass and headlights.',
    suggested: { lensType: 'single', tint: 'grey', polarization: 'yes', coating: 'ar_blue' },
  },
  {
    id: 'sport',
    label: 'Sport & outdoors',
    description: 'Sun, water and open sky.',
    suggested: { lensType: 'single', tint: 'grey', polarization: 'yes', coating: 'ar' },
  },
  {
    id: 'reading',
    label: 'Reading',
    description: 'Books and close-up work.',
    suggested: { lensType: 'reading', tint: 'clear', coating: 'ar' },
  },
  {
    id: 'screen',
    label: 'Screen & computer',
    description: 'Long hours in front of a display.',
    suggested: { lensType: 'single', tint: 'clear', coating: 'blue' },
  },
  {
    id: 'sun',
    label: 'Strong sunlight',
    description: 'Beach, snow, high altitude.',
    suggested: { lensType: 'plano', tint: 'grey', polarization: 'yes', coating: 'ar' },
  },
];

// Sensible step values for the prescription form, used for validation only.
// This does not attempt to be a full optical validator.
export const PRESCRIPTION_RANGES = {
  sph:  { min: -20, max: 20, step: 0.25 },
  cyl:  { min: -6,  max: 6,  step: 0.25 },
  axis: { min: 0,   max: 180, step: 1   },
  pd:   { min: 40,  max: 80, step: 0.5 },
};

// Empty prescription shape. Stored in the cart line as config.prescription.
// Demo-only: not yet validated against any optical standard, and not stored
// server-side. Will become real when the orders backend lands.
export function emptyPrescription() {
  return {
    od: { sph: '', cyl: '', axis: '', pd: '' },
    os: { sph: '', cyl: '', axis: '', pd: '' },
    uploadId: null,
    uploadedFileName: null,
    uploadedSizeBytes: null,
  };
}

// True if every prescription field is blank. Used to decide whether to show
// "prescription added" in the review and cart summaries.
export function isPrescriptionEmpty(rx) {
  if (!rx) return true;
  if (rx.uploadId) return false;
  const fields = ['sph', 'cyl', 'axis', 'pd'];
  for (const eye of ['od', 'os']) {
    for (const f of fields) {
      if (rx[eye] && String(rx[eye][f] || '').trim() !== '') return false;
    }
  }
  return true;
}

// Human-readable label for the cart line.
// Returns null when there is nothing to show.
export function prescriptionLabel(rx) {
  if (!rx) return null;
  if (rx.uploadId) return 'PRESCRIPTION — UPLOADED';
  if (!isPrescriptionEmpty(rx)) return 'PRESCRIPTION — ENTERED';
  return null;
}







// Apply the suggested defaults from an activity on top of the current config.
export function applyActivitySuggestions(config, activityId) {
  const activity = ACTIVITIES.find((a) => a.id === activityId);
  if (!activity) return config;
  return { ...config, ...activity.suggested, activity: activityId };
}

// --- Existing helpers, unchanged in behaviour ---

export function getGroupsForProductType(productType) {
  return LENS_GROUPS.filter((g) => g.appliesTo.includes(productType));
}

export function defaultConfigForProductType(productType) {
  const config = {};
  for (const group of getGroupsForProductType(productType)) {
    config[group.id] = group.options[0].id;
  }
  // New defaults used by the wizard. These do not break the existing
  // dropdown configurator (which only iterates the groups).
  config.activity = 'everyday';
  config.prescription = emptyPrescription();
  config.frameOnly = false;
  config.variantId = null;
  return config;
}

export function configSummary(productType, config) {
  const parts = [];
  for (const group of getGroupsForProductType(productType)) {
    const selectedId = config[group.id];
    const option = group.options.find((o) => o.id === selectedId);
    if (option && option.priceDelta > 0) parts.push(option.label);
  }
  return parts;
}

export function configTotalDelta(productType, config) {
  let total = 0;
  for (const group of getGroupsForProductType(productType)) {
    const selectedId = config[group.id];
    const option = group.options.find((o) => o.id === selectedId);
    if (option) total += option.priceDelta;
  }
  return total;
}

export function tintOverlayFor(productType, config) {
  const tintGroup = LENS_GROUPS.find((g) => g.id === 'tint');
  if (!tintGroup.appliesTo.includes(productType)) return null;
  const option = tintGroup.options.find((o) => o.id === config.tint);
  return option ? option.overlay : null;
}

// Stable cart-line key: two products with the same id but different configs
// become two separate cart lines. Nested objects are serialised properly so
// different prescriptions do not collide.
function serialiseValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function cartLineKey(productId, config) {
  const entries = Object.keys(config || {})
    .sort()
    .map((k) => `${k}=${serialiseValue(config[k])}`);
  return `${productId}::${entries.join('|')}`;
}