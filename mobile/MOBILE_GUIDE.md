# Mobile Project — Developer Guide

> For a developer comfortable with React, TypeScript, and web tooling who is new to mobile / React Native.

---

## Table of Contents

1. [Mental Model — How mobile differs from web](#1-mental-model)
2. [What is Expo?](#2-what-is-expo)
3. [What is EAS?](#3-what-is-eas)
4. [What is Metro?](#4-what-is-metro)
5. [What is NativeWind?](#5-what-is-nativewind)
6. [Project Entry Point](#6-project-entry-point)
7. [Routing — Expo Router (file-based)](#7-routing--expo-router)
8. [Layout Files & Route Groups](#8-layout-files--route-groups)
9. [Auth Flow](#9-auth-flow)
10. [API Layer](#10-api-layer)
11. [Secure Storage](#11-secure-storage)
12. [Push Notifications](#12-push-notifications)
13. [Components](#13-components)
14. [Styling — NativeWind + Tailwind](#14-styling--nativewind--tailwind)
15. [Data Fetching — TanStack Query](#15-data-fetching--tanstack-query)
16. [Forms — React Hook Form + Zod](#16-forms--react-hook-form--zod)
17. [Environment Variables](#17-environment-variables)
18. [app.json — Expo Config](#18-appjson--expo-config)
19. [eas.json — EAS Build Profiles](#19-easjson--eas-build-profiles)
20. [TypeScript Config](#20-typescript-config)
21. [Building the App](#21-building-the-app)
22. [Android / Gradle Details](#22-android--gradle-details)

---

## 1. Mental Model

If you are coming from a Next.js / web background, here is the key translation table:

| Web concept | React Native equivalent |
|---|---|
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` — **all text must be inside `<Text>`** |
| `<img>` | `<Image>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<Pressable>` or `<TouchableOpacity>` |
| `<a>` / `<Link>` | `<Link>` from `expo-router` |
| CSS file | Inline styles or NativeWind (Tailwind) class names |
| Browser DOM | Native UI components rendered by the OS |
| Webpack/Vite | Metro (React Native bundler) |
| `localStorage` | `AsyncStorage` / `expo-secure-store` |
| `window.location` | Expo Router navigation |
| npm run dev | `expo start` |

The biggest conceptual shift: **there is no HTML, no DOM, no browser**. React Native maps your JSX to actual OS widgets (Android Views, iOS UIKit). Styling is a JavaScript object (or class names via NativeWind) that is translated to native layout — not CSS files.

---

## 2. What is Expo?

**Expo** is a layer on top of React Native that:

- Provides a large set of pre-built native modules (camera, file system, notifications, secure storage, etc.) that are already compiled and ready to use — no manual Android/iOS native code required.
- Ships a **bundler (`expo start`)** that wraps Metro and provides a QR code / dev server for quick iteration.
- Provides **Expo Go** — a companion app on the phone that can load your JS bundle over the network without installing a full APK. (Not all modules work inside Expo Go — see §3.)
- Manages the **SDK version** — a single `expo` version pin coordinates compatible versions of all `expo-*` packages.

> **Official docs:** https://docs.expo.dev/

### Key Expo packages used in this project

| Package | Purpose |
|---|---|
| `expo-router` | File-based navigation (see §7) |
| `expo-secure-store` | Keychain/Keystore-backed token storage |
| `expo-notifications` | Local & push notification APIs |
| `expo-image-picker` | Camera roll / camera access |
| `expo-constants` | Runtime access to `app.json` values and EAS project ID |
| `expo-device` | Detect if running on a real device vs emulator |
| `expo-font` | Font loading |
| `expo-asset` | Static asset management |
| `expo-status-bar` | Status bar style control |

---

## 3. What is EAS?

**EAS (Expo Application Services)** is Expo's cloud build and delivery platform. It has three main tools:

### EAS Build
Runs your Android/iOS build on Expo's servers. You push your source code, and get back a signed APK / AAB / IPA without needing Android Studio or a Mac.

```
eas build --platform android --profile preview
```

### EAS Submit
Uploads a built artifact directly to the Play Store or App Store:

```
eas submit --platform android
```

### EAS Update (OTA)
Pushes JavaScript-only updates to users' installed apps without going through the store review process. Only JS and assets change — native code still requires a full build.

> **Official docs:** https://docs.expo.dev/build/introduction/

---

## 4. What is Metro?

**Metro** is the JavaScript bundler for React Native (similar to Webpack/Vite, but for mobile). It:

- Watches your source files
- Resolves module imports
- Transforms TypeScript/JSX
- Serves the bundle to the device over the network

`metro.config.js` in this project adds the NativeWind integration on top of the default Expo Metro config:

```js
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

> **Official docs:** https://metrobundler.dev/

---

## 5. What is NativeWind?

**NativeWind** lets you write Tailwind CSS class names directly in React Native JSX. It transforms them into React Native stylesheet objects at build time. This is the mobile equivalent of using Tailwind in a Next.js project.

```tsx
// Web (Next.js)
<div className="flex items-center p-4 bg-zinc-900">...</div>

// React Native with NativeWind — identical syntax
<View className="flex-1 items-center p-4 bg-zinc-900">...</View>
```

**How it works:**

1. `global.css` imports Tailwind (`@import "tailwindcss"`)
2. `metro.config.js` runs NativeWind's Metro plugin to process the CSS
3. `babel.config.js` sets `jsxImportSource: 'nativewind'` so JSX className props are recognized
4. At runtime, NativeWind resolves class names to React Native `StyleSheet` objects

`darkMode: 'media'` in `tailwind.config.js` means dark mode follows the OS system setting automatically.

> **Official docs:** https://www.nativewind.dev/

---

## 6. Project Entry Point

The chain from "app launches" to "first screen renders":

```
package.json  →  "main": "expo-router/entry"
                        │
                        ▼
               expo-router bootstraps Metro
               and looks for app/_layout.tsx
                        │
                        ▼
              app/_layout.tsx   (RootLayout)
              - wraps everything in <AuthProvider>
              - wraps in <QueryClientProvider>
              - renders <Slot />  ← placeholder for child routes
                        │
                        ▼
              app/index.tsx     (redirect logic)
              - reads auth state from AuthContext
              - if loading → spinner
              - if user    → redirect to /(app)
              - otherwise  → redirect to /(auth)/login
```

There is **no `index.html`**, no `main.tsx`, no `createRoot`. Expo Router's entry takes care of that.

---

## 7. Routing — Expo Router

Expo Router is **identical in concept to Next.js App Router** — the file path IS the route.

```
app/
├── index.tsx          →  /          (redirect)
├── (auth)/
│   ├── login.tsx      →  /(auth)/login
│   ├── register.tsx   →  /(auth)/register
│   ├── verify-otp.tsx →  /(auth)/verify-otp
│   ├── forgot-password.tsx
│   └── reset-password.tsx
└── (app)/
    ├── (tabs)/
    │   ├── index.tsx      →  /(app)/(tabs)/     (home feed)
    │   ├── submit.tsx     →  /(app)/(tabs)/submit
    │   ├── notifications.tsx
    │   └── account.tsx
    ├── post/[id].tsx      →  /(app)/post/123    (dynamic)
    ├── zone/[slug].tsx    →  /(app)/zone/my-zone
    ├── user/[alias].tsx   →  /(app)/user/someone
    ├── search.tsx
    └── zones.tsx
```

**Key differences from Next.js App Router:**

| Next.js | Expo Router |
|---|---|
| `<Link href="/about">` | `<Link href="/(app)/post/123">` |
| `useRouter().push('/path')` | `useRouter().push('/(app)/search')` |
| `useParams()` | `useLocalSearchParams()` |
| `layout.tsx` wraps children | `_layout.tsx` wraps children |
| Route groups `(group)` work the same | identical |

**Dynamic routes** use `[param]` syntax. Access with:

```ts
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

> **Official docs:** https://docs.expo.dev/router/introduction/

---

## 8. Layout Files & Route Groups

### `app/_layout.tsx` — Root layout

Sets up global providers:
- `AuthProvider` — auth state across the whole app
- `QueryClientProvider` — TanStack Query cache
- `StatusBar` — OS status bar style

Uses `<Slot />` (like Next.js `{children}`) as the outlet for child routes.

### `app/(auth)/_layout.tsx` — Auth stack

A `<Stack>` navigator containing login, register, OTP, etc.  
**Guard:** if the user is already logged in → `<Redirect href="/(app)" />`.

### `app/(app)/_layout.tsx` — App stack

A `<Stack>` navigator for the authenticated area.  
**Guard:** if no user → `<Redirect href="/(auth)/login" />`.  
Also registers the push notification token on first load.

### `app/(app)/(tabs)/_layout.tsx` — Bottom tabs

A `<Tabs>` navigator — this is what renders the bottom navigation bar. Each tab maps to a file in the `(tabs)/` directory. The unread notification count is polled every 20s here and displayed as a badge on the notifications tab.

### Route groups `(name)/`

Parentheses in directory names are **group markers** — they are invisible in the URL. They exist purely to organize layouts and apply guards:

- `(auth)` — one Stack navigator, one auth guard
- `(app)` — another Stack navigator, the opposite guard
- `(tabs)` — the tab bar

---

## 9. Auth Flow

### Storage

Tokens and user data are stored in the device's secure enclave via `expo-secure-store` (`lib/storage.ts`):

```
gspot_access_token   → JWT, short-lived
gspot_refresh_token  → used to get new access tokens
gspot_user           → { id, alias, email } (serialized JSON)
```

On Android this uses the Android **Keystore**. On iOS, the **Keychain**.

### AuthContext (`contexts/AuthContext.tsx`)

A React Context that holds:
- `user` — the logged-in user object (or `null`)
- `isLoading` — `true` while restoring session from SecureStore on app launch
- Methods: `login`, `logout`, `register`, `verifyOTP`, `resendOTP`, `forgotPassword`, `resetPassword`

**Session restoration** runs once on mount:

```
app starts → read SecureStore → if both user + accessToken exist → setUser()
```

### JWT Refresh (`lib/api.ts`)

The Axios client has a response interceptor that:
1. Catches `401` responses
2. Calls `/auth/refresh` with the stored refresh token
3. Re-runs all queued requests with the new access token
4. If refresh fails → calls `onAuthFailed()` (set by AuthContext) → clears storage → forces logout

This is transparent to all `lib/*.ts` API modules — they just call `apiClient.get/post/...`.

---

## 10. API Layer

All HTTP calls go through a single Axios instance in `lib/api.ts`:

```ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://gspot.ge';
export const apiClient = axios.create({ baseURL: `${API_BASE_URL}/api/v1`, timeout: 15_000 });
```

Interceptors:
- **Request interceptor** — attaches `Authorization: Bearer <token>` from SecureStore
- **Response interceptor** — handles `401` with token refresh (see §9)
- In `__DEV__` mode, all requests and responses are logged to the Metro console

Per-resource modules (`lib/feed.ts`, `lib/posts.ts`, `lib/zones.ts`, etc.) export typed functions that call `apiClient`. No raw `fetch` calls anywhere in the app.

---

## 11. Secure Storage

`lib/storage.ts` is a thin wrapper over `expo-secure-store`. It provides:

```ts
storage.getAccessToken()
storage.getRefreshToken()
storage.setTokens(access, refresh)
storage.getUser()
storage.setUser(user)
storage.clear()
```

`expo-secure-store` is synchronous-looking but async (returns Promises). It maps to:
- **Android:** Android Keystore-backed `EncryptedSharedPreferences`
- **iOS:** Keychain Services

> **Official docs:** https://docs.expo.dev/versions/latest/sdk/securestore/

---

## 12. Push Notifications

`lib/pushNotifications.ts` handles the one-time permission + token registration:

1. Skip if running in Expo Go (`ExecutionEnvironment.StoreClient`) — push tokens require a real build
2. Skip if running in an emulator (`Device.isDevice === false`) — FCM doesn't work on emulators
3. On Android, create the `default` notification channel
4. Request permission from the OS
5. Call `Notifications.getExpoPushTokenAsync({ projectId })` — returns an Expo Push Token (`ExponentPushToken[…]`)
6. Send the token to the backend (`/notifications/push-token`) via `savePushToken()`

The Expo Push Service receives this token and forwards push messages to FCM (Android) / APNs (iOS).

> **Official docs:** https://docs.expo.dev/push-notifications/overview/

---

## 13. Components

All shared primitive UI lives in `components/ui/`:

| Component | What it does |
|---|---|
| `ScreenLayout` | `SafeAreaView` + `KeyboardAvoidingView` wrapper. Handles safe-area insets (notch, home bar) and auto-adjusts layout when soft keyboard appears. Optionally wraps children in a `ScrollView`. |
| `Button` | Pressable with variants (`primary`, `secondary`, `ghost`, `danger`), loading spinner state, and disabled state. |
| `Input` | Styled `TextInput` wrapper with label, error message, and password visibility toggle. |
| `ProfileAvatar` | Displays initials + background color derived from the user's alias. Falls back gracefully if no image. |
| `LevelBadge` | Small badge showing user XP level. |
| `TagBadge` | Pill badge for post tags. |
| `AppDrawer` | Slide-in side drawer (280px) with gesture detection (`PanResponder`). Navigates to zones, profile, etc. Animated with `Animated.timing` using the native driver. |

---

## 14. Styling — NativeWind + Tailwind

Class names work identically to Tailwind CSS web. A few mobile-specific utilities:

| Class | Meaning |
|---|---|
| `flex-1` | `flex: 1` — fills available space (very common, equivalent to `height: 100%`) |
| `items-center` | `alignItems: 'center'` |
| `justify-center` | `justifyContent: 'center'` |
| `gap-3` | spacing between children (RN 0.71+) |
| `active:bg-zinc-800` | style applied on press (like `:active` in CSS) |
| `dark:bg-zinc-950` | applied when OS is in dark mode |

The brand color is defined in `tailwind.config.js`:

```js
colors: { brand: { DEFAULT: '#14B8A6', dark: '#0D9488' } }
```

Use as `bg-brand`, `text-brand`, `active:bg-brand-dark`.

---

## 15. Data Fetching — TanStack Query

The app uses **TanStack Query v5** for all server state. It is set up in `app/_layout.tsx`:

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
```

Usage pattern (identical to web):

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['post', id],
  queryFn: () => postsApi.getPost(id),
});

const mutation = useMutation({
  mutationFn: (body) => postsApi.submitPost(body),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
});
```

> **Official docs:** https://tanstack.com/query/latest/docs/framework/react/overview

---

## 16. Forms — React Hook Form + Zod

Pattern used in auth screens (and anywhere with forms):

```ts
const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
type FormData = z.infer<typeof schema>;

const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

Error messages displayed via the `Input` component's `error` prop:

```tsx
<Input label="Email" error={errors.email?.message} {...register('email')} />
```

> **React Hook Form docs:** https://react-hook-form.com/  
> **Zod docs:** https://zod.dev/

---

## 17. Environment Variables

Create `mobile/.env` (never commit this file):

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

**Rules:**
- All variables **must** be prefixed with `EXPO_PUBLIC_` to be accessible in JS
- They are inlined at Metro bundle time — **not** runtime secrets
- Access in code: `process.env.EXPO_PUBLIC_API_URL`
- During local dev, use your machine's LAN IP (not `localhost` — the device/emulator cannot reach your machine's `localhost`)

Finding your LAN IP:
```bash
# Windows
ipconfig   # look for "IPv4 Address" under your Wi-Fi adapter

# Mac/Linux
ifconfig | grep "inet "
```

The fallback in `lib/api.ts` is `'https://gspot.ge'`, so if no `.env` is present it hits production.

> **Official docs:** https://docs.expo.dev/guides/environment-variables/

---

## 18. `app.json` — Expo Config

This is the central config for the Expo project. Key fields:

```json
{
  "expo": {
    "name": "G'Spot",               // display name on home screen
    "slug": "gspot-mobile",         // unique identifier on expo.dev
    "version": "0.1.0",             // displayed version
    "orientation": "portrait",       // lock to portrait
    "newArchEnabled": true,          // React Native new architecture (Fabric renderer)
    "android": {
      "package": "ge.gspot.mobile"  // Android package name (like a namespace)
    },
    "plugins": [ ... ],              // Expo config plugins — auto-configure native code
    "scheme": "gspot",               // deep link URL scheme: gspot://...
    "extra.eas.projectId": "..."     // links this project to expo.dev for EAS
  }
}
```

### Plugins

Expo **config plugins** run at build time and automatically modify the native `AndroidManifest.xml`, `Info.plist`, etc. For example:
- `"expo-notifications"` plugin adds the FCM config to `AndroidManifest.xml`
- `"expo-secure-store"` adds the required permissions

You never need to touch native files manually for supported libraries.

> **Official docs:** https://docs.expo.dev/config/app/

---

## 19. `eas.json` — EAS Build Profiles

Defines three build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,      // builds expo-dev-client — a custom Expo Go with all native modules
      "distribution": "internal"      // share via download link, not store
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",           // plain APK, sideloadable
        "gradleCommand": ":app:assembleRelease"
      },
      "autoIncrement": true           // bumps versionCode automatically
    },
    "production": {
      "android": {
        "buildType": "app-bundle"     // AAB — required for Play Store
      },
      "autoIncrement": true
    }
  }
}
```

`"cli": { "appVersionSource": "remote" }` means EAS manages the `versionCode` counter on its servers (avoids conflicts when multiple developers trigger builds).

> **Official docs:** https://docs.expo.dev/build/eas-json/

---

## 20. TypeScript Config

`tsconfig.json` extends `expo/tsconfig.base` which sets `"moduleResolution": "bundler"` and `"jsx": "react-native"`.

The `@/*` path alias maps to the project root:

```json
"paths": { "@/*": ["./*"] }
```

So `import { apiClient } from '@/lib/api'` resolves to `<project-root>/lib/api.ts`.

This alias is also understood by Metro via Babel (`babel-preset-expo`) and by TypeScript. No extra config needed.

---

## 21. Building the App

### Development — fastest iteration

```bash
cd mobile
npm install
npm start        # starts Metro, shows QR code
```

Scan the QR code with the **Expo Go** app (Android/iOS) — loads JS only, no native code rebuild needed.

**Limitations of Expo Go:** push notifications and some secure-store flows won't work. For full testing use a development build.

### Development Build (full native)

```bash
# Build once on EAS (takes ~5 min)
eas build --platform android --profile development

# Install the resulting APK on your device
# Then start Metro locally:
npm start
# The dev build connects to your Metro server over LAN
```

### Preview APK (internal testing)

```bash
npm run build:android:preview
# → EAS builds a release-mode APK
# → outputs a download URL for direct install
```

### Production AAB (Play Store)

```bash
npm run build:android:prod
# → EAS builds a release AAB
# → use eas submit or upload manually to Play Console
```

---

## 22. Android / Gradle Details

`android/` is the native Android project generated and managed by Expo. You rarely need to touch it manually.

### Structure

```
android/
├── app/
│   ├── build.gradle    # app-level: dependencies, signing, minSdk/targetSdk
│   └── src/main/       # AndroidManifest.xml, Java/Kotlin source (auto-generated)
├── build.gradle        # project-level: repositories, classpath (Gradle plugin versions)
├── gradle.properties   # JVM args, new architecture flag
├── settings.gradle     # includes :app module
└── gradle/wrapper/
    └── gradle-wrapper.properties  # pins the exact Gradle version
```

### Key Gradle commands (run from `android/`)

```bash
./gradlew tasks                  # list all available tasks
./gradlew assembleDebug          # debug APK → android/app/build/outputs/apk/debug/
./gradlew assembleRelease        # release APK (needs keystore)
./gradlew bundleRelease          # release AAB
./gradlew clean                  # clean build outputs
./gradlew :app:dependencies      # show full dependency tree
```

### Why does EAS not need Gradle locally?

EAS clones your repo and runs Gradle in a Docker container on their server — a controlled environment with the right JDK, Android SDK, and NDK. You only need Gradle locally if you want to build offline or debug native issues.

### `gradle.properties` highlights

```properties
android.useAndroidX=true
newArchEnabled=true     # enables Fabric (new renderer) and TurboModules
```

`newArchEnabled=true` matches `app.json`'s `"newArchEnabled": true`. Both must be in sync.

> **React Native new architecture docs:** https://reactnative.dev/docs/the-new-architecture/landing-page  
> **Gradle docs:** https://docs.gradle.org/current/userguide/userguide.html  
> **Android build docs:** https://developer.android.com/studio/build
