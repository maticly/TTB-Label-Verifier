# TTB Label Verification Tool

AI-powered alcohol label verification system that compares extracted label data against TTB application data using Google's Gemini Flash vision model and intelligent matching algorithms.

## What This Project Does

This tool verifies that alcohol labels match their approved TTB application data by:
1. Extracting structured data from label images using AI vision
2. Comparing extracted fields against application data using fuzzy and exact matching
3. Providing clear pass/fail results with detailed explanations for each field
4. Supporting both single-label verification and batch processing of hundreds of labels

The system is designed for TTB staff and industry stakeholders to quickly verify label compliance without manual inspection.

## Tech Stack and Rationale

- **Next.js (App Router)** - Provides a stable, production-ready framework with excellent developer experience. Deployed on Vercel for a stable free URL with fast cold starts, ensuring the tool is always accessible without infrastructure management.

- **Google Gemini Flash (gemini-2.0-flash)** - Chosen for its fast vision capabilities. A single API call per label extracts all required fields, meeting the 5-second response time target for vendor pilot scenarios. The model's JSON mode ensures structured, reliable output.

- **TypeScript** - Type safety throughout the codebase prevents runtime errors and improves maintainability.

- **Tailwind CSS** - Utility-first CSS framework enables rapid development of clean, accessible UIs with consistent styling.

- **fastest-levenshtein** - Efficient string similarity library for fuzzy matching of brand names, class types, and net contents.

- **p-limit** - Concurrency control for batch processing, limiting simultaneous Gemini API calls to 6 to avoid rate limits while processing large batches efficiently.

- **No Database** - This prototype is stateless by design. No persistence is needed for the verification workflow, eliminating complexity and cost. All processing happens in-memory during the request.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd work_project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add your Gemini API key**
   - Copy `.env.example` to `.env.local` (if not already present)
   - Add your Gemini API key: `GEMINI_API_KEY=your_actual_api_key_here` (can be found in [Gemini Studio](https://makersuite.google.com/app/apikey))

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)

## Requirements Traceability

| Stakeholder Note | Feature | Implementation |
|------------------|---------|----------------|
| **Dave's STONE'S THROW example** (brand name formatting variations should pass) | Fuzzy matching for brand name, class type, and net contents | `lib/matching.ts` uses Levenshtein distance with 0.9 similarity threshold after normalization (lowercase, trim, collapse whitespace, strip punctuation) |
| **Jenny's warning-statement note** (exact match required, bold/caps formatting check) | Exact matching for government warning text + formatting validation | `lib/matching.ts` performs case-sensitive exact match against canonical TTB warning text and checks `governmentWarningFormatted` boolean |
| **Sarah's vendor-pilot story** (5-second response time target) | Single fast vision call per label using Gemini Flash | `lib/gemini.ts` makes one API call to gemini-2.0-flash with JSON mode; timing logged to console for verification |
| **Sarah's importer story** (batch processing of 200-300 labels) | Batch upload with concurrency control | `app/api/verify-batch/route.ts` uses p-limit with cap of 6 simultaneous calls; UI supports multiple file selection and JSON array input |
| **"73-year-old mother" benchmark** (simple, accessible UI for non-technical users) | Clean, high-contrast UI with large touch targets and plain language | All components use minimum 16px text, large buttons, clear labels, no jargon, drag-and-drop with fallback file picker |
| **Marcus's note** (COLA integration out of scope) | No COLA integration | System focuses solely on label-to-application verification; COLA data not included in scope |

## Known Limitations / Future Work

- **Image Quality Handling**: The prototype assumes reasonably clear, well-lit label photos. Handling skewed, rotated, or poorly-lit images was flagged as out of scope for this prototype (per Jenny's suggestion). Future iterations could add image preprocessing (deskewing, brightness adjustment, OCR fallback) to handle challenging images.

- **Government Warning Text Variations**: The system requires an exact match against the canonical TTB warning text. Some approved labels may have minor variations that would fail verification. Future work could implement more flexible matching for warning text while still catching substantive errors.

- **Batch Progress Updates**: The current batch processing shows a loading state but doesn't provide real-time progress updates during processing. Future enhancements could add WebSocket or polling-based progress indicators for large batches.

- **Error Recovery**: If a single label in a batch fails processing, the batch continues but the error is logged. Future versions could offer retry mechanisms for failed items.

- **Mobile Optimization**: While the UI is responsive, the drag-and-drop interface is optimized for desktop use. Mobile-first improvements could enhance the experience for tablet users.

## License

MIT
