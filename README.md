# TTB Label Verification Tool

AI-powered alcohol label verification system that compares extracted label data against TTB application data using Google's Gemini vision model and a mix of fuzzy and exact matching logic.

## What This Project Does

This tool verifies that alcohol labels match their approved TTB application data by:
1. Extracting structured data from label images using AI vision
2. Comparing extracted fields against application data using fuzzy and exact matching
3. Providing clear pass/fail results with detailed explanations for each field, always showing both the extracted and expected values
4. Supporting both single-label verification and batch processing of many labels at once

The system is designed for TTB compliance staff to quickly verify label accuracy without manual field-by-field inspection.

## Approach

The core design decision was to keep the verification pipeline to a single AI call per label, followed by deterministic comparison logic — rather than making multiple AI calls per label, or asking the model to do the comparison itself.

1. **Extraction**: one vision-model call per label image returns a structured JSON object with brand name, class/type, alcohol content, net contents, the government warning text verbatim, and whether that warning appears bold and in all capital letters.
2. **Comparison**: extracted fields are compared against the application data using two different strategies depending on the field:
   - **Fuzzy matching** (brand name, class/type, net contents) — tolerant of case, punctuation, and spacing differences, since these are legitimate formatting variations an approving agent would accept by eye (e.g. "STONE'S THROW" vs. "Stone's Throw.").
   - **Exact matching** (government warning text and its formatting) — the warning statement must match the canonical TTB text word-for-word and be bold/all-caps, since this is a fixed regulatory requirement with no acceptable variation.
   - **Numeric matching** (alcohol content) — tolerant of case, punctuation, spacing, and suffix wording ("46% alc./vol." vs. "46%"), but compared as the actual regulated percentage value, so a genuinely different ABV still fails.
3. **Batch mode** applies the same per-label pipeline across many labels concurrently (capped at 6 simultaneous requests), with applicant data supplied via a downloadable CSV template rather than hand-typed data, matched to each image by filename.

This design was chosen specifically to meet the ~5 second per-label response time target — one AI call plus fast, local comparison logic is inherently faster and more predictable than a multi-call or model-does-everything approach.

## Tech Stack and Rationale

- **Next.js (App Router)** — stable, production-ready framework. Deployed on Vercel for a free, persistent URL with fast serverless cold starts, so the tool stays reachable without infrastructure management.
- **Google Gemini (gemini-3.1-flash-lite)** — chosen for fast, low-latency multimodal extraction. A single request per label, using plain REST calls to the Gemini API with `responseMimeType: "application/json"` for structured output, avoids multiple round trips and keeps the pipeline within the response-time budget.
- **TypeScript** — type safety across the extraction, matching, and API layers.
- **Tailwind CSS (v4)** — utility-first styling for a clean, accessible, high-contrast UI.
- **fastest-levenshtein** — string similarity for fuzzy matching of brand name, class/type, and net contents.
- **papaparse** — parses the batch CSV upload (applicant data) and matches rows to uploaded label images by filename.
- **p-limit** — caps batch processing at 6 concurrent Gemini requests, balancing throughput against rate limits.
- **No database** — the prototype is stateless by design; verification results are held in memory for the duration of a request and displayed directly, with no persistence layer needed for this scope.

## Assumptions Made

- The canonical government warning text is treated as fixed and singular — the system checks against one authoritative version of the TTB warning statement.
- Alcohol content is treated as a single regulated percentage value; suffix wording around it ("Alc./Vol.", "Alcohol by Volume") is assumed to be formatting, not a compliance-relevant difference, so it's ignored during comparison.
- Label images are assumed to be reasonably clear, upright, and well-lit; handling of skewed, rotated, or poorly-lit photos was explicitly out of scope for this prototype.
- Batch CSV filenames are matched to uploaded images case-insensitively and extension-agnostically (a CSV row for "label1" matches an uploaded "label1.jpg" or "LABEL1.PNG"), since requiring an exact filename match was judged too brittle for real-world use.
- Test label images were AI-generated/synthetic, since real TTB applicant data wasn't available for this exercise.
- No authentication, user accounts, or data persistence were implemented, per the brief's explicit note that storage and PII handling are out of scope for this prototype.

## Setup Instructions

1. **Clone the repository**
```bash
   git clone <https://github.com/maticly/TTB-Label-Verifier>
   cd work_project
```

2. **Install dependencies**
```bash
   npm install
```

3. **Add your Gemini API key**
   - Copy `.env.example` to `.env.local` (if not already present)
   - Add your key: `GEMINI_API_KEY=your_actual_api_key_here` (get one at [Google AI Studio](https://aistudio.google.com/app/apikey))

4. **Run the development server**
```bash
   npm run dev
```

5. **Open in browser** — navigate to [http://localhost:3000](http://localhost:3000)

6. **For batch processing** — click "Download CSV Template" on the Batch Processing tab, fill in one row per label (matched by filename), and upload it alongside your label images.

## Requirements Traceability

| Stakeholder Note | Feature | Implementation |
|---|---|---|
| **Dave's STONE'S THROW example** (formatting variations should pass) | Fuzzy matching for brand name, class/type, and net contents | `lib/matching.ts` — Levenshtein similarity after normalization (lowercase, trim, collapse whitespace, strip punctuation) |
| **Jenny's warning-statement note** (exact match + bold/caps check) | Exact matching for government warning text and formatting | `lib/matching.ts` — case-sensitive exact match against canonical TTB text, plus a `governmentWarningFormatted` check |
| **Sarah's vendor-pilot story** (~5 second response time) | Single vision call per label | `lib/gemini.ts` — one REST call to `gemini-3.1-flash-lite`; response time logged to console |
| **Sarah's importer story** (batch processing of many labels) | Batch upload with CSV input and concurrency control | `app/api/verify-batch/route.ts` — CSV parsed with papaparse, matched by filename, processed with `p-limit` capped at 6 |
| **"73-year-old mother" benchmark** (simple, accessible UI) | Clean, high-contrast UI, plain language, downloadable CSV template instead of manual data entry | All components use large text/buttons, drag-and-drop with a file-picker fallback |
| **Marcus's note** (COLA integration out of scope) | No COLA integration | System is a standalone label-to-application verifier only |

## Known Limitations / Future Work

- **Image quality handling** — skewed, rotated, or poorly-lit label photos are out of scope for this prototype (per Jenny's note); future work could add deskewing, brightness correction, or an OCR fallback.
- **Government warning text variations** — the system requires an exact match to one canonical warning text; legitimate approved variations would currently fail and would need more flexible handling.
- **Model version stability** — vision model IDs from hosted providers change relatively often; the model name in `lib/gemini.ts` may need periodic updates if the pinned version is deprecated.
- **Batch progress feedback** — the UI currently shows a loading state without granular per-label progress; a polling or streaming progress indicator would improve the experience for large batches.
- **Error recovery** — a failed label within a batch is logged and skipped rather than retried; future versions could add retry logic for transient failures.
- **Mobile optimization** — the UI is responsive but the drag-and-drop flow is optimized for desktop; a mobile-first pass could improve the tablet experience.

## License

MIT