/**
 * Test catalog: the single source of truth for which lab tests the app
 * recognises, how their names are normalised (for trend tracking), which
 * organ/body system they relate to (for the anatomy view), and a short
 * neutral description used when the AI service is unavailable.
 *
 * Descriptions are intentionally educational and non-diagnostic.
 */

const ORGANS = {
  brain: {
    key: 'brain',
    name: 'Brain & Nerves',
    description: 'Some vitamins support healthy nerve and brain function.',
  },
  thyroid: {
    key: 'thyroid',
    name: 'Thyroid',
    description: 'A small gland in the neck that makes hormones controlling metabolism and energy.',
  },
  heart: {
    key: 'heart',
    name: 'Heart & Vessels',
    description: 'Blood fats (lipids) are commonly checked as part of heart health screening.',
  },
  lungs: {
    key: 'lungs',
    name: 'Lungs',
    description: 'Lungs bring oxygen into the blood. Few routine blood tests relate directly to them.',
  },
  liver: {
    key: 'liver',
    name: 'Liver',
    description: 'The liver processes nutrients, makes proteins and helps clear waste from the blood.',
  },
  pancreas: {
    key: 'pancreas',
    name: 'Pancreas & Sugar',
    description: 'The pancreas makes insulin, which helps control blood sugar levels.',
  },
  kidneys: {
    key: 'kidneys',
    name: 'Kidneys',
    description: 'Kidneys filter waste from the blood and balance salts and water.',
  },
  blood: {
    key: 'blood',
    name: 'Blood',
    description: 'Blood counts describe red cells, white cells and platelets, plus iron and related values.',
  },
  bones: {
    key: 'bones',
    name: 'Bones & Minerals',
    description: 'Calcium, phosphorus and vitamin D are important for bones and muscles.',
  },
  other: {
    key: 'other',
    name: 'Other Tests',
    description: 'Tests that are not mapped to a specific organ.',
  },
};

// key: stable normalised key used for trends
// aliases: lower-case names as they commonly appear on Indian/international lab reports
const TESTS = [
  // ---------- Blood (CBC) ----------
  { key: 'hemoglobin', name: 'Hemoglobin', organ: 'blood', unit: 'g/dL', aliases: ['hemoglobin', 'haemoglobin', 'hb', 'hgb'], description: 'Hemoglobin is the protein in red blood cells that carries oxygen around the body.' },
  { key: 'rbc', name: 'RBC Count', organ: 'blood', unit: 'million/µL', aliases: ['rbc count', 'red blood cell count', 'rbc', 'total rbc count', 'erythrocyte count'], description: 'Red blood cell count is the number of red cells that carry oxygen.' },
  { key: 'wbc', name: 'WBC Count', organ: 'blood', unit: 'cells/µL', aliases: ['wbc count', 'total wbc count', 'white blood cell count', 'total leucocyte count', 'total leukocyte count', 'tlc', 'wbc'], description: 'White blood cells are part of the immune system and help the body respond to infection and inflammation.' },
  { key: 'platelets', name: 'Platelet Count', organ: 'blood', unit: 'cells/µL', aliases: ['platelet count', 'platelets', 'plt'], description: 'Platelets are small cells that help blood to clot.' },
  { key: 'hematocrit', name: 'Hematocrit (PCV)', organ: 'blood', unit: '%', aliases: ['hematocrit', 'haematocrit', 'pcv', 'packed cell volume', 'hct'], description: 'Hematocrit is the percentage of blood volume made up of red cells.' },
  { key: 'mcv', name: 'MCV', organ: 'blood', unit: 'fL', aliases: ['mcv', 'mean corpuscular volume'], description: 'MCV is the average size of red blood cells.' },
  { key: 'mch', name: 'MCH', organ: 'blood', unit: 'pg', aliases: ['mch', 'mean corpuscular hemoglobin'], description: 'MCH is the average amount of hemoglobin in each red blood cell.' },
  { key: 'mchc', name: 'MCHC', organ: 'blood', unit: 'g/dL', aliases: ['mchc', 'mean corpuscular hemoglobin concentration'], description: 'MCHC is the concentration of hemoglobin within red blood cells.' },
  { key: 'rdw', name: 'RDW', organ: 'blood', unit: '%', aliases: ['rdw', 'rdw-cv', 'red cell distribution width'], description: 'RDW describes how much red blood cells vary in size.' },
  { key: 'neutrophils', name: 'Neutrophils', organ: 'blood', unit: '%', aliases: ['neutrophils', 'neutrophil', 'polymorphs'], description: 'Neutrophils are the most common type of white blood cell.' },
  { key: 'lymphocytes', name: 'Lymphocytes', organ: 'blood', unit: '%', aliases: ['lymphocytes', 'lymphocyte'], description: 'Lymphocytes are white blood cells involved in immune responses.' },
  { key: 'monocytes', name: 'Monocytes', organ: 'blood', unit: '%', aliases: ['monocytes', 'monocyte'], description: 'Monocytes are white blood cells that help clear debris and germs.' },
  { key: 'eosinophils', name: 'Eosinophils', organ: 'blood', unit: '%', aliases: ['eosinophils', 'eosinophil'], description: 'Eosinophils are white blood cells often linked with allergies and certain responses.' },
  { key: 'basophils', name: 'Basophils', organ: 'blood', unit: '%', aliases: ['basophils', 'basophil'], description: 'Basophils are a small group of white blood cells.' },
  { key: 'esr', name: 'ESR', organ: 'blood', unit: 'mm/hr', aliases: ['esr', 'erythrocyte sedimentation rate'], description: 'ESR is a general marker that can change when there is inflammation in the body.' },
  { key: 'crp', name: 'C-Reactive Protein', organ: 'blood', unit: 'mg/L', aliases: ['c-reactive protein', 'c reactive protein', 'crp', 'hs-crp', 'hscrp'], description: 'CRP is a protein whose level can rise with inflammation.' },
  { key: 'iron', name: 'Serum Iron', organ: 'blood', unit: 'µg/dL', aliases: ['serum iron', 'iron'], description: 'Serum iron measures the iron circulating in the blood.' },
  { key: 'ferritin', name: 'Ferritin', organ: 'blood', unit: 'ng/mL', aliases: ['ferritin', 'serum ferritin'], description: 'Ferritin reflects how much iron the body has stored.' },

  // ---------- Pancreas / sugar ----------
  { key: 'glucose_fasting', name: 'Fasting Blood Sugar', organ: 'pancreas', unit: 'mg/dL', aliases: ['fasting blood sugar', 'fasting blood glucose', 'glucose fasting', 'fbs', 'fasting plasma glucose', 'blood sugar fasting', 'glucose (fasting)'], description: 'Fasting blood sugar is the glucose level after not eating for several hours.' },
  { key: 'glucose_pp', name: 'Post-Meal Blood Sugar', organ: 'pancreas', unit: 'mg/dL', aliases: ['post prandial blood sugar', 'postprandial blood sugar', 'ppbs', 'glucose pp', 'blood sugar pp', 'glucose (pp)'], description: 'Post-meal blood sugar is measured about two hours after eating.' },
  { key: 'glucose_random', name: 'Random Blood Sugar', organ: 'pancreas', unit: 'mg/dL', aliases: ['random blood sugar', 'rbs', 'random blood glucose', 'glucose random'], description: 'Random blood sugar is a glucose level taken at any time of day.' },
  { key: 'hba1c', name: 'HbA1c', organ: 'pancreas', unit: '%', aliases: ['hba1c', 'glycated hemoglobin', 'glycosylated hemoglobin', 'a1c'], description: 'HbA1c reflects average blood sugar over roughly the past three months.' },
  { key: 'amylase', name: 'Amylase', organ: 'pancreas', unit: 'U/L', aliases: ['amylase', 'serum amylase'], description: 'Amylase is a digestive enzyme made mainly by the pancreas and salivary glands.' },
  { key: 'lipase', name: 'Lipase', organ: 'pancreas', unit: 'U/L', aliases: ['lipase', 'serum lipase'], description: 'Lipase is a digestive enzyme made by the pancreas that helps break down fats.' },

  // ---------- Heart / lipids ----------
  { key: 'cholesterol_total', name: 'Total Cholesterol', organ: 'heart', unit: 'mg/dL', aliases: ['total cholesterol', 'cholesterol total', 'serum cholesterol', 'cholesterol'], description: 'Total cholesterol is the overall amount of cholesterol, a type of fat, in the blood.' },
  { key: 'ldl', name: 'LDL Cholesterol', organ: 'heart', unit: 'mg/dL', aliases: ['ldl cholesterol', 'ldl-cholesterol', 'ldl', 'ldl-c', 'low density lipoprotein'], description: 'LDL is often called "bad" cholesterol because higher levels are linked with buildup in blood vessels.' },
  { key: 'hdl', name: 'HDL Cholesterol', organ: 'heart', unit: 'mg/dL', aliases: ['hdl cholesterol', 'hdl-cholesterol', 'hdl', 'hdl-c', 'high density lipoprotein'], description: 'HDL is often called "good" cholesterol because it helps carry cholesterol away from blood vessels.' },
  { key: 'triglycerides', name: 'Triglycerides', organ: 'heart', unit: 'mg/dL', aliases: ['triglycerides', 'triglyceride', 'tg', 'serum triglycerides'], description: 'Triglycerides are a type of fat in the blood that the body uses for energy.' },
  { key: 'vldl', name: 'VLDL Cholesterol', organ: 'heart', unit: 'mg/dL', aliases: ['vldl cholesterol', 'vldl'], description: 'VLDL is a type of lipoprotein that mainly carries triglycerides.' },
  { key: 'troponin', name: 'Troponin', organ: 'heart', unit: 'ng/mL', aliases: ['troponin i', 'troponin t', 'troponin', 'hs troponin'], description: 'Troponin is a heart muscle protein measured in specific clinical situations.' },

  // ---------- Liver ----------
  { key: 'alt', name: 'ALT (SGPT)', organ: 'liver', unit: 'U/L', aliases: ['alt', 'sgpt', 'alt (sgpt)', 'sgpt (alt)', 'alanine aminotransferase', 'alanine transaminase'], description: 'ALT is an enzyme found mostly in the liver.' },
  { key: 'ast', name: 'AST (SGOT)', organ: 'liver', unit: 'U/L', aliases: ['ast', 'sgot', 'ast (sgot)', 'sgot (ast)', 'aspartate aminotransferase', 'aspartate transaminase'], description: 'AST is an enzyme found in the liver and other tissues such as muscle.' },
  { key: 'alp', name: 'Alkaline Phosphatase', organ: 'liver', unit: 'U/L', aliases: ['alkaline phosphatase', 'alp', 'alk phos'], description: 'Alkaline phosphatase is an enzyme found in the liver and bones.' },
  { key: 'ggt', name: 'GGT', organ: 'liver', unit: 'U/L', aliases: ['ggt', 'gamma gt', 'gamma glutamyl transferase', 'ggtp'], description: 'GGT is a liver enzyme.' },
  { key: 'bilirubin_total', name: 'Total Bilirubin', organ: 'liver', unit: 'mg/dL', aliases: ['total bilirubin', 'bilirubin total', 'serum bilirubin', 'bilirubin'], description: 'Bilirubin is a yellow substance made when red blood cells break down; the liver helps remove it.' },
  { key: 'bilirubin_direct', name: 'Direct Bilirubin', organ: 'liver', unit: 'mg/dL', aliases: ['direct bilirubin', 'bilirubin direct', 'conjugated bilirubin'], description: 'Direct bilirubin is the part of bilirubin that has been processed by the liver.' },
  { key: 'albumin', name: 'Albumin', organ: 'liver', unit: 'g/dL', aliases: ['albumin', 'serum albumin'], description: 'Albumin is a protein made by the liver that helps keep fluid in blood vessels.' },
  { key: 'total_protein', name: 'Total Protein', organ: 'liver', unit: 'g/dL', aliases: ['total protein', 'serum protein', 'protein total'], description: 'Total protein measures albumin and other proteins in the blood.' },

  // ---------- Kidneys / electrolytes ----------
  { key: 'creatinine', name: 'Creatinine', organ: 'kidneys', unit: 'mg/dL', aliases: ['creatinine', 'serum creatinine', 's. creatinine'], description: 'Creatinine is a waste product from muscles that the kidneys filter out.' },
  { key: 'urea', name: 'Blood Urea', organ: 'kidneys', unit: 'mg/dL', aliases: ['blood urea', 'urea', 'serum urea'], description: 'Urea is a waste product from protein breakdown that the kidneys remove.' },
  { key: 'bun', name: 'Blood Urea Nitrogen', organ: 'kidneys', unit: 'mg/dL', aliases: ['blood urea nitrogen', 'bun'], description: 'BUN measures the nitrogen part of urea in the blood.' },
  { key: 'uric_acid', name: 'Uric Acid', organ: 'kidneys', unit: 'mg/dL', aliases: ['uric acid', 'serum uric acid'], description: 'Uric acid is a waste product that the kidneys remove from the blood.' },
  { key: 'egfr', name: 'eGFR', organ: 'kidneys', unit: 'mL/min/1.73m²', aliases: ['egfr', 'estimated gfr', 'gfr'], description: 'eGFR is an estimate of how well the kidneys are filtering blood.' },
  { key: 'sodium', name: 'Sodium', organ: 'kidneys', unit: 'mmol/L', aliases: ['sodium', 'serum sodium', 'na', 'na+'], description: 'Sodium is a salt that helps control fluid balance and nerve signals.' },
  { key: 'potassium', name: 'Potassium', organ: 'kidneys', unit: 'mmol/L', aliases: ['potassium', 'serum potassium', 'k', 'k+'], description: 'Potassium is a mineral important for muscle and heart rhythm.' },
  { key: 'chloride', name: 'Chloride', organ: 'kidneys', unit: 'mmol/L', aliases: ['chloride', 'serum chloride', 'cl', 'cl-'], description: 'Chloride is a salt that works with sodium to balance fluids.' },

  // ---------- Thyroid ----------
  { key: 'tsh', name: 'TSH', organ: 'thyroid', unit: 'µIU/mL', aliases: ['tsh', 'thyroid stimulating hormone', 'tsh (ultrasensitive)', 'ultrasensitive tsh'], description: 'TSH is a hormone from the brain that tells the thyroid how much hormone to make.' },
  { key: 't3', name: 'Total T3', organ: 'thyroid', unit: 'ng/dL', aliases: ['total t3', 't3 total', 't3', 'triiodothyronine'], description: 'T3 is one of the main thyroid hormones.' },
  { key: 't4', name: 'Total T4', organ: 'thyroid', unit: 'µg/dL', aliases: ['total t4', 't4 total', 't4', 'thyroxine'], description: 'T4 is the main hormone made by the thyroid.' },
  { key: 'ft3', name: 'Free T3', organ: 'thyroid', unit: 'pg/mL', aliases: ['free t3', 'ft3'], description: 'Free T3 is the active, unbound form of T3 in the blood.' },
  { key: 'ft4', name: 'Free T4', organ: 'thyroid', unit: 'ng/dL', aliases: ['free t4', 'ft4'], description: 'Free T4 is the unbound form of T4 available to the body.' },

  // ---------- Bones / minerals ----------
  { key: 'calcium', name: 'Calcium', organ: 'bones', unit: 'mg/dL', aliases: ['calcium', 'serum calcium', 'total calcium'], description: 'Calcium is a mineral important for bones, muscles and nerves.' },
  { key: 'phosphorus', name: 'Phosphorus', organ: 'bones', unit: 'mg/dL', aliases: ['phosphorus', 'serum phosphorus', 'inorganic phosphorus', 'phosphate'], description: 'Phosphorus works with calcium to build bones and teeth.' },
  { key: 'vitamin_d', name: 'Vitamin D', organ: 'bones', unit: 'ng/mL', aliases: ['vitamin d', 'vitamin d3', '25-oh vitamin d', '25 hydroxy vitamin d', 'vit d', '25(oh) vitamin d'], description: 'Vitamin D helps the body absorb calcium and supports bones and muscles.' },

  // ---------- Brain / nerves ----------
  { key: 'vitamin_b12', name: 'Vitamin B12', organ: 'brain', unit: 'pg/mL', aliases: ['vitamin b12', 'vit b12', 'b12', 'cyanocobalamin', 'serum b12'], description: 'Vitamin B12 is needed for healthy nerves and making red blood cells.' },
  { key: 'folate', name: 'Folate', organ: 'brain', unit: 'ng/mL', aliases: ['folate', 'folic acid', 'serum folate'], description: 'Folate is a B vitamin needed to make healthy cells.' },
];

// Pre-computed alias index, longest alias first so "ldl cholesterol" wins over "cholesterol".
const ALIAS_INDEX = TESTS.flatMap((t) => t.aliases.map((alias) => ({ alias, test: t }))).sort(
  (a, b) => b.alias.length - a.alias.length
);

const BY_KEY = Object.fromEntries(TESTS.map((t) => [t.key, t]));

function normaliseName(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the catalog test whose alias appears at the start of `text`.
 * Returns { test, matchedLength } or null.
 */
function matchAtStart(text) {
  const lower = normaliseName(text);
  for (const { alias, test } of ALIAS_INDEX) {
    const re = new RegExp(`^${escapeRegex(alias)}(?![a-z0-9])`, 'i');
    if (re.test(lower)) return { test, alias };
  }
  return null;
}

/** Resolve any free-text test name to a catalog entry (exact alias match). */
function lookup(name) {
  const n = normaliseName(name).replace(/\s*\(.*?\)\s*$/, '').trim();
  const exact = ALIAS_INDEX.find(({ alias }) => alias === n || alias === normaliseName(name));
  if (exact) return exact.test;
  const start = matchAtStart(name);
  return start ? start.test : null;
}

function slugify(name) {
  return normaliseName(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

module.exports = { ORGANS, TESTS, BY_KEY, lookup, matchAtStart, normaliseName, slugify };
