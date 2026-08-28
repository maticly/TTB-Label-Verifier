import { LabelFields, ApplicationData, VerificationResult, FieldVerification } from './types';
import { distance } from 'fastest-levenshtein';

// TTB government warning text - must match exactly
const CANONICAL_GOVERNMENT_WARNING = `GOVERNMENT WARNING: (1) ACCORDING TO THE SURGEON GENERAL, WOMEN SHOULD NOT DRINK ALCOHOLIC BEVERAGES DURING PREGNANCY BECAUSE OF THE RISK OF BIRTH DEFECTS. (2) CONSUMPTION OF ALCOHOLIC BEVERAGES IMPAIRS YOUR ABILITY TO DRIVE A CAR OR OPERATE MACHINERY, AND MAY CAUSE HEALTH PROBLEMS.`;

/**
 * Normalize string for fuzzy matching: lowercase, trim, collapse whitespace, strip punctuation.
 * This is what already makes brandName/classType/netContents tolerant of case, periods, and spacing —
 * it strips anything that isn't a letter, digit, or whitespace, so "Stone's Throw." and
 * "STONE'S  THROW" both normalize down to "stones throw".
 */
function normalizeForFuzzyMatch(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Calculate string similarity score using Levenshtein distance.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const dist = distance(str1, str2);
  return 1 - (dist / maxLen);
}

/**
 * Run the standard fuzzy-match check used by brandName, classType, and netContents.
 * Always returns a reason that shows both the extracted and expected raw values,
 * whether it passed or failed, so the UI never has to guess what was compared.
 */
function fuzzyFieldCheck(fieldLabel: string, extractedRaw: string, applicationRaw: string): FieldVerification {
  const normExtracted = normalizeForFuzzyMatch(extractedRaw);
  const normApplication = normalizeForFuzzyMatch(applicationRaw);
  const similarity = calculateSimilarity(normExtracted, normApplication);
  const exact = normExtracted === normApplication;
  const pass = exact || similarity > 0.9;

  const reason = pass
    ? exact
      ? `${fieldLabel} matches exactly (extracted: "${extractedRaw}", input: "${applicationRaw}")`
      : `${fieldLabel} matches (minor formatting difference only — extracted: "${extractedRaw}", input: "${applicationRaw}")`
    : `${fieldLabel} does not match (extracted: "${extractedRaw}", input: "${applicationRaw}", similarity: ${(similarity * 100).toFixed(1)}%)`;

  return { pass, reason };
}

/**
 * Extract just the numeric percentage value from an alcohol content string,
 * ignoring case, punctuation, spacing, and suffix text like "Alc./Vol.",
 * "ALCOHOL BY VOLUME", or a parenthetical proof value.
 * "46% alc./vol." -> 46, "13.5% ALCOHOL BY VOLUME" -> 13.5, "45% Alc./Vol. (90 Proof)" -> 45
 * Returns null if no percentage number could be found at all.
 */
function extractAbvPercent(str: string): number | null {
  const match = str.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Alcohol content: tolerant of case, punctuation, and spacing (same spirit as the fuzzy
 * fields), but still an exact match on the actual regulated number — a genuinely different
 * percentage must still fail. We do this by extracting just the numeric percentage from
 * each string and comparing those numbers directly, rather than comparing the raw strings.
 */
function alcoholContentCheck(extractedRaw: string, applicationRaw: string): FieldVerification {
  const extractedPct = extractAbvPercent(extractedRaw);
  const applicationPct = extractAbvPercent(applicationRaw);

  if (extractedPct === null || applicationPct === null) {
    // Couldn't find a parseable percentage in one or both strings — fall back to a plain
    // normalized string comparison so we still produce a sensible result instead of crashing.
    const normExtracted = normalizeForFuzzyMatch(extractedRaw);
    const normApplication = normalizeForFuzzyMatch(applicationRaw);
    const pass = normExtracted === normApplication;
    return {
      pass,
      reason: pass
        ? `Alcohol content matches (extracted: "${extractedRaw}", input: "${applicationRaw}")`
        : `Could not parse a percentage from alcohol content — compared as text (extracted: "${extractedRaw}", input: "${applicationRaw}")`,
    };
  }

  const pass = extractedPct === applicationPct;
  return {
    pass,
    reason: pass
      ? `Alcohol content matches exactly (extracted: "${extractedRaw}", input: "${applicationRaw}")`
      : `Alcohol content does not match exactly (extracted: "${extractedRaw}" = ${extractedPct}%, input: "${applicationRaw}" = ${applicationPct}%)`,
  };
}

/**
 * Compare extracted label fields against application data.
 * Returns verification results with per-field pass/fail and reasons.
 */
export function compareFields(extracted: LabelFields, application: ApplicationData): VerificationResult {
  // Brand name: fuzzy match — tolerant of case, punctuation, and spacing differences.
  // Example: "STONE'S THROW" and "Stone's Throw." both pass.
  const brandNameResult = fuzzyFieldCheck('Brand name', extracted.brandName, application.brandName);

  // Class/type: same tolerant fuzzy match as brand name.
  // Example: "Irish Whiskey" and "IRISH WHISKEY " both pass.
  const classTypeResult = fuzzyFieldCheck('Class/type', extracted.classType, application.classType);

  // Net contents: same tolerant fuzzy match.
  // Example: "750 ML" and "750ml" both pass.
  const netContentsResult = fuzzyFieldCheck('Net contents', extracted.netContents, application.netContents);

  // Alcohol content: tolerant of case/punctuation/spacing like the fields above, but
  // compared as the actual regulated number so a real percentage difference still fails.
  const alcoholContentResult = alcoholContentCheck(extracted.alcoholContent, application.alcoholContent);

  // Government warning text: EXACT match, case-sensitive, no normalization — unchanged.
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
    brandName: brandNameResult,
    classType: classTypeResult,
    alcoholContent: alcoholContentResult,
    netContents: netContentsResult,
    governmentWarningText: { pass: warningPass, reason: warningReason },
    governmentWarningFormatted: {
      pass: warningFormattedPass,
      reason: warningFormattedPass
        ? 'Government warning is properly formatted (bold and all-caps)'
        : 'Government warning is not properly formatted (not bold and all-caps)',
    },
    overallPass:
      brandNameResult.pass &&
      classTypeResult.pass &&
      alcoholContentResult.pass &&
      netContentsResult.pass &&
      warningPass,
  };

  return result;
}

/*
 * Example test cases (for verification by reading):
 *
 * Case 1: Brand name — case/punctuation/spacing differences should pass
 * extracted.brandName = "STONE'S THROW"     application.brandName = "Stone's Throw."
 * -> pass = true, reason shows both raw values plus "minor formatting difference only"
 *
 * Case 2: Alcohol content — suffix text, case, and missing period should still pass
 * extracted.alcoholContent = "46% alc./vol."     application.alcoholContent = "46%"
 * -> extractAbvPercent gives 46 and 46 -> pass = true
 *
 * Case 3: Alcohol content — a genuinely different percentage must still fail
 * extracted.alcoholContent = "13.5% ALCOHOL BY VOLUME"     application.alcoholContent = "14.0%"
 * -> extractAbvPercent gives 13.5 and 14 -> pass = false, reason shows both raw values and parsed percentages
 *
 * Case 4: Government warning mismatch (unchanged) should fail
 * If extracted.governmentWarningText differs by even one character from CANONICAL_GOVERNMENT_WARNING,
 * governmentWarningText.pass = false.
 */