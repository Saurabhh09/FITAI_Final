# FITAI Mobile Application Workspace

This repository is a dedicated **mobile-only** application for FITAI, targeted for the Google Play Store and Apple App Store.

## Architecture
- **Mobile Application:** `apps/mobile/` (React Native, Expo SDK 57, Expo Router).
- **Core Engine:** `packages/nutrition-engine/` (Deterministic nutrition and macro calculations).
- **Backend / Database:** Cloud Supabase (`@supabase/supabase-js`) & USDA FoodData Central.

## Key Rules
- All user-facing features, UI screens, and platform behaviors belong in `apps/mobile/`.
- Never introduce desktop web dependencies (Next.js, DOM elements, or web server assumptions).
- Mobile runs directly and independently against cloud services with persistent native authentication.
- Run tests with `npm test`.
- Run typecheck with `npm run typecheck`.
- Run development client with `npm start` (`npx expo start --dev-client`).
