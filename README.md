# FITAI Mobile

FITAI is a native mobile nutrition and calorie tracking application built with **React Native**, **Expo SDK 57**, and **Expo Router**, targeting the Google Play Store and Apple App Store.

## Key Features
- **Deterministic Nutrition Engine:** Evidence-based BMR, TDEE, macro split, and calorie target calculation (`packages/nutrition-engine`).
- **Direct Cloud Integration:** Authenticated directly against Supabase Cloud (`@supabase/supabase-js`) with native persistent sessions (`@react-native-async-storage/async-storage`).
- **Food & Meal Tracking:** Search and log verified foods directly via USDA FoodData Central and cached canonical foods with zero intermediary web server requirement.
- **Hydration & Weight Tracking:** Real-time logging synced directly to cloud tables.
- **Native Experience:** Custom wheel date pickers, native gestures, smooth transitions, and dark/light system adaptation.

## Project Structure
```
├── apps/
│   └── mobile/              # React Native / Expo Mobile App (screens, navigation, native components)
├── packages/
│   └── nutrition-engine/    # Deterministic nutrition, BMR, TDEE, and macro calculation engine
├── supabase/                # PostgreSQL schemas, migrations, and Row-Level Security policies
└── scripts/                 # Mobile environment and tooling patch scripts
```

## Getting Started

### Prerequisites
- Node.js >= 22.13.0
- npm >= 11.0.0
- Android device / emulator or iOS simulator connected
- Expo Go / Expo Dev Client

### Running the App
```bash
# Start Expo development server
npm start

# Run directly on Android device
npm run android

# Run directly on iOS simulator
npm run ios
```

### Validation & Testing
```bash
# Run full unit and integration test suite
npm test

# Run TypeScript typecheck
npm run typecheck

# Run linter
npm run lint
```
