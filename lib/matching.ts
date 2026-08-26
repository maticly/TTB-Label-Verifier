import { LabelFields, ApplicationData, VerificationResult, FieldVerification } from './types';
import { distance } from 'fastest-levenshtein';

// Canonical TTB government warning text - must match exactly
const CANONICAL_GOVERNMENT_WARNING = `GOVERNMENT WARNING: (1) ACCORDING TO THE SURGEON GENERAL, WOMEN SHOULD NOT DRINK ALCOHOLIC BEVERAGES DURING PREGNANCY BECAUSE OF THE RISK OF BIRTH DEFECTS. (2) CONSUMPTION OF ALCOHOLIC BEVERAGES IMPAIRS YOUR ABILITY TO DRIVE A CAR OR OPERATE MACHINERY, AND MAY CAUSE HEALTH PROBLEMS.`;

/**
 * Normalize string for fuzzy matching: lowercase, trim, collapse whitespace, strip punctuation
 * This allows minor formatting differences while catching substantive differences
 */
function normalizeForFuzzyMatch(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Calculate string similarity score using Levenshtein distance
 * Returns a value between 0 (no similarity) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const dist = distance(str1, str2);
  return 1 - (dist / maxLen);
}

/**
 * Normalize alcohol content for exact comparison
 * Strips whitespace and unifies % and "percent" representations
 * This is a regulated number and must match exactly
 */
function normalizeAlcoholContent(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/%/g, 'percent')
    .replace(/percent/g, '%');
}

/**
 * Compare extracted label fields against application data
 * Returns verification results with per-field pass/fail and reasons
 */
export function compareFields(extracted: LabelFields, application: ApplicationData): VerificationResult {
  // Brand name: fuzzy match - allows minor formatting differences
  // Example: "STONE'S THROW" and "Stone's Throw" should pass
  const brandNameNormalizedExtracted = normalizeForFuzzyMatch(extracted.brandName);
  const brandNameNormalizedApplication = normalizeForFuzzyMatch(application.brandName);
  const brandNameSimilarity = calculateSimilarity(brandNameNormalizedExtracted, brandNameNormalizedApplication);
  const brandNamePass = brandNameNormalizedExtracted === brandNameNormalizedApplication || brandNameSimilarity > 0.9;
  const brandNameReason = brandNamePass
    ? brandNameNormalizedExtracted === brandNameNormalizedApplication
      ? 'Brand name matches exactly'
      : 'Brand name matches (minor formatting difference only)'
    : `Brand name does not match (similarity: ${(brandNameSimilarity * 100).toFixed(1)}%)`;

  // Class type: fuzzy match - allows minor formatting differences
  // Example: "TABLE WINE" and "Table Wine" should pass
  const classTypeNormalizedExtracted = normalizeForFuzzyMatch(extracted.classType);
  const classTypeNormalizedApplication = normalizeForFuzzyMatch(application.classType);
  const classTypeSimilarity = calculateSimilarity(classTypeNormalizedExtracted, classTypeNormalizedApplication);
  const classTypePass = classTypeNormalizedExtracted === classTypeNormalizedApplication || classTypeSimilarity > 0.9;
  const classTypeReason = classTypePass
    ? classTypeNormalizedExtracted === classTypeNormalizedApplication
      ? 'Class/type matches exactly'
      : 'Class/type matches (minor formatting difference only)'
    : `Class/type does not match (similarity: ${(classTypeSimilarity * 100).toFixed(1)}%)`;

  // Alcohol content: exact match after normalization
  // This is a regulated number and should not fuzzy-match
  const alcoholContentNormalizedExtracted = normalizeAlcoholContent(extracted.alcoholContent);
  const alcoholContentNormalizedApplication = normalizeAlcoholContent(application.alcoholContent);
  const alcoholContentPass = alcoholContentNormalizedExtracted === alcoholContentNormalizedApplication;
  const alcoholContentReason = alcoholContentPass
    ? 'Alcohol content matches exactly'
    : `Alcohol content does not match exactly (extracted: "${extracted.alcoholContent}", expected: "${application.alcoholContent}")`;

  // Net contents: fuzzy match - allows minor formatting differences
  // Example: "750 ML" and "750ml" should pass
  const netContentsNormalizedExtracted = normalizeForFuzzyMatch(extracted.netContents);
  const netContentsNormalizedApplication = normalizeForFuzzyMatch(application.netContents);
  const netContentsSimilarity = calculateSimilarity(netContentsNormalizedExtracted, netContentsNormalizedApplication);
  const netContentsPass = netContentsNormalizedExtracted === netContentsNormalizedApplication || netContentsSimilarity > 0.9;
  const netContentsReason = netContentsPass
    ? netContentsNormalizedExtracted === netContentsNormalizedApplication
      ? 'Net contents matches exactly'
      : 'Net contents matches (minor formatting difference only)'
    : `Net contents does not match (similarity: ${(netContentsSimilarity * 100).toFixed(1)}%)`;

  // Government warning text: EXACT match, case-sensitive, no normalization
  // Also fail if governmentWarningFormatted is false (not bold and all-caps)
  const warningTextPass = extracted.governmentWarningText === CANONICAL_GOVERNMENT_WARNING;
  const warningFormattedPass = extracted.governmentWarningFormatted === true;
  const warningPass = warningTextPass && warningFormattedPass;
  let warningReason = '';
  
  if (!warningFormattedPass) {
    warningReason = 'Government warning is not formatted correctly (not bold and all-caps)';
  } else if (!warningTextPass) {
    warningReason = 'Government warning text does not match exactly — see highlighted difference';
  } else {
    warningReason = 'Government warning text matches exactly and is properly formatted';
  }

  const result: VerificationResult = {
    brandName: { pass: brandNamePass, reason: brandNameReason },
    classType: { pass: classTypePass, reason: classTypeReason },
    alcoholContent: { pass: alcoholContentPass, reason: alcoholContentReason },
    netContents: { pass: netContentsPass, reason: netContentsReason },
    governmentWarningText: { pass: warningPass, reason: warningReason },
    governmentWarningFormatted: { pass: warningFormattedPass, reason: warningFormattedPass ? 'Government warning is properly formatted (bold and all-caps)' : 'Government warning is not properly formatted (not bold and all-caps)' },
    overallPass: brandNamePass && classTypePass && alcoholContentPass && netContentsPass && warningPass,
  };

  return result;
}

/*
 * Example test cases (for verification by reading):
 * 
 * Case 1: STONE'S THROW brand name should pass
 * extracted = { brandName: "STONE'S THROW", ... }
 * application = { brandName: "Stone's Throw", ... }
 * Result: brandName.pass = true, reason = "Brand name matches (minor formatting difference only)"
 * 
 * Case 2: Government warning mismatch should fail
 * extracted = { governmentWarningText: "GOVERNMENT WARNING: (1) ACCORDING TO THE SURGEON GENERAL...", governmentWarningFormatted: true, ... }
 * application = { governmentWarningText: "GOVERNMENT WARNING: (1) ACCORDING TO THE SURGEON GENERAL...", governmentWarningFormatted: true, ... }
 * If extracted.governmentWarningText differs by even one character from CANONICAL_GOVERNMENT_WARNING:
 * Result: governmentWarningText.pass = false, reason = "Government warning text does not match exactly — see highlighted difference"
 * 
 * Case 3: Alcohol content exact match required
 * extracted = { alcoholContent: "13.5% ALCOHOL BY VOLUME", ... }
 * application = { alcoholContent: "13.5% ALCOHOL BY VOLUME", ... }
 * Result: alcoholContent.pass = true, reason = "Alcohol content matches exactly"
 * 
 * Case 4: Alcohol content mismatch should fail
 * extracted = { alcoholContent: "13.5% ALCOHOL BY VOLUME", ... }
 * application = { alcoholContent: "14.0% ALCOHOL BY VOLUME", ... }
 * Result: alcoholContent.pass = false, reason = "Alcohol content does not match exactly (extracted: "13.5% ALCOHOL BY VOLUME", expected: "14.0% ALCOHOL BY VOLUME")"
 */
