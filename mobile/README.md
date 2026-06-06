# G'Spot Mobile

React Native app for the G'Spot platform, built with Expo SDK 56 and Expo Router.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.85 + Expo SDK 56 |
| Routing | Expo Router 56 (file-based, similar to Next.js App Router) |
| Styling | NativeWind 4 (Tailwind CSS for React Native) |
| State / Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| HTTP client | Axios with JWT refresh interceptor |
| Secure storage | `expo-secure-store` |
| Push notifications | `expo-notifications` + Expo Push Service |
| Build / OTA | EAS Build + EAS Submit |
| Language | TypeScript 6 (strict) |

## Requirements

- **Node.js** >= 18
- **npm** >= 10
- **Expo CLI** — installed globally: `npm install -g expo-cli eas-cli`
- **Android Studio** + Android SDK (for local Android builds)
- Java 17 (required by the Gradle toolchain)

## Environment Variables

Copy `.env.example` to `.env` and set the API base URL:

```
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000   # dev
EXPO_PUBLIC_API_URL=https://gspot.ge            # prod
```

All Expo public env vars **must** be prefixed with `EXPO_PUBLIC_`. They are inlined at build time by Metro and are not secret.

## Running in Development

```bash
# Install dependencies
npm install

# Start the Metro bundler (opens Expo Dev Tools in browser)
npm start          # expo start

# Open directly on a connected Android device / emulator
npm run android    # expo run:android

# Open on iOS simulator (macOS only)
# npm run ios
```

> **Expo Go vs. Dev Build** — The project uses `expo-notifications` push tokens and `expo-secure-store`, which are not fully supported inside the Expo Go app. Use a **development build** (`eas build --profile development`) or `expo run:android` for full functionality.

## Building

### Local (Gradle, Android only)

```bash
# Debug APK
cd android
./gradlew assembleDebug

# Release APK (requires signing config)
./gradlew assembleRelease

# Release AAB (for Play Store)
./gradlew bundleRelease
```

### Via EAS Build (cloud)

EAS builds run on Expo's infrastructure. No local Android SDK needed.

```bash
# Preview APK — distributed internally (direct download link)
npm run build:android:preview   # eas build --platform android --profile preview

# Production AAB — for Play Store
npm run build:android:prod      # eas build --platform android --profile production

# Development build — full native modules, connects to local Metro
eas build --platform android --profile development
```

Build profiles are defined in [`eas.json`](./eas.json).

## Project Structure

```
mobile/
├── app/                  # Expo Router pages (file = route)
│   ├── _layout.tsx       # Root layout — providers, StatusBar
│   ├── index.tsx         # Entry redirect (auth guard)
│   ├── (auth)/           # Unauthenticated stack (login, register, OTP…)
│   └── (app)/            # Authenticated stack
│       ├── _layout.tsx   # Auth guard + Stack navigator
│       ├── (tabs)/       # Bottom-tab group (feed, submit, notifications, account)
│       ├── post/[id].tsx # Post detail (Stack screen)
│       ├── zone/[slug].tsx
│       ├── user/[alias].tsx
│       ├── search.tsx
│       └── zones.tsx
├── components/ui/        # Shared primitive components
├── contexts/
│   └── AuthContext.tsx   # Auth state, token management
├── lib/                  # API modules and utilities
│   ├── api.ts            # Axios client + JWT refresh interceptor
│   ├── storage.ts        # expo-secure-store wrapper
│   ├── auth.ts           # Auth API calls
│   ├── pushNotifications.ts
│   └── …                 # Per-resource API modules
├── types/                # Shared TypeScript types
├── assets/               # Icons, splash, fonts
├── constants/colors.ts
├── app.json              # Expo project config
├── eas.json              # EAS build profiles
├── metro.config.js       # Metro bundler (NativeWind integration)
├── babel.config.js       # Babel presets (NativeWind JSX transform)
├── tailwind.config.js
└── tsconfig.json         # Extends expo/tsconfig.base, @/* alias
```

## Path Alias

TypeScript path `@/*` maps to the project root (`./`).  
Example: `import { apiClient } from '@/lib/api'`.

## Linting

```bash
npm run lint   # expo lint (ESLint with Expo config)
```

## Useful Links

- [Expo Router docs](https://docs.expo.dev/router/introduction/)
- [EAS Build docs](https://docs.expo.dev/build/introduction/)
- [NativeWind docs](https://www.nativewind.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
