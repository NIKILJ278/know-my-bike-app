# Know My Bike — Bike Garage & Expense Tracker

A full real-time biker's app: garage of bikes, fuel/expense/trip logbook,
document vault, a personal profile dashboard with full riding statistics,
and an AI assistant — with email+password login, Google sign-in, and
OTP-based password reset. Built with React + Vite + Tailwind + Supabase.

Everything below runs on **free tiers** (Supabase free project, Vercel/
Netlify free hosting) and every command is written for **Windows Command
Prompt (cmd.exe)** — open it from your project folder by typing `cmd` in
the File Explorer address bar and pressing Enter, or by right-clicking
inside the folder and choosing "Open in Terminal".

## Features

- **Auth**: email + password (with username), Google one-tap OAuth, and a
  3-step OTP flow for "forgot password" (email → 6-digit code → new password).
- **Garage**: multi-bike support, odometer & average mileage, this-month vs
  lifetime spend, quick actions, upcoming service reminders, recent activity.
- **Logbook**: Expenses / Fuel / Trips tabs with category filters; fuel
  mileage (km/l) is auto-calculated from consecutive full-tank fills via a
  Postgres trigger.
- **Vault**: insurance/RC/PUC/license documents with auto Valid/Expired badges.
- **Profile dashboard**: a full account report — identity card with an
  editable name, lifetime/monthly spend, a spending-breakdown chart by
  category, fuel and trip totals, document status (valid / expiring /
  expired), and a per-bike summary, all pulled live from every bike you own.
- **Ask AI**: chat assistant for maintenance, mileage and mod questions,
  aware of your active bike.
- **Realtime**: every table syncs live across tabs/devices via Supabase
  Realtime — no refresh needed.
- **Dark / light mode** toggle, persisted per device.
- Row-level security: every row is scoped to its owner — no user can ever see
  another user's data.

## Prerequisites (Windows)

Install these once, then verify each with the command shown:

| Tool | Get it from | Verify |
|---|---|---|
| Node.js LTS (v18+) | https://nodejs.org | `node -v` and `npm -v` |
| Git for Windows | https://git-scm.com/download/win | `git --version` |
| Android Studio (only needed for the APK step) | https://developer.android.com/studio | opens without error |

## 1. Install dependencies

Open Command Prompt in the project folder, then:

```bat
npm install
```

## 2. Create your Supabase project (free)

1. Go to https://supabase.com → New project (free tier is enough).
2. Once created, open **SQL Editor** → paste the entire contents of
   `supabase\schema.sql` from this project → **Run**. This creates every
   table (bikes, fuel_logs, expenses, trips, documents, reminders, profiles),
   row-level security policies so users only ever see their own data, and
   turns on realtime sync.
3. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.

## 3. Configure the app

```bat
copy .env.example .env
notepad .env
```

Paste your Project URL and anon key into the file, save, and close Notepad.

## 4. Run the app locally

```bat
npm run dev
```

Open http://localhost:5173 — you should see the login screen.

## 5. Turn on Google sign-in (optional)

1. In Supabase Dashboard → **Authentication → Providers → Google** → enable it.
2. Create OAuth credentials at https://console.cloud.google.com/apis/credentials
   (OAuth client ID → Web application).
3. Add this as an **Authorized redirect URI** (Supabase shows the exact URL on
   the same provider screen): `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
4. Paste the Google Client ID and Secret back into the Supabase provider screen → Save.
5. In **Authentication → URL Configuration**, add your deployed app URL (and
   `http://localhost:5173` for local dev) to **Redirect URLs**.

## 6. Turn on OTP-code password reset (optional)

By default Supabase's "reset password" email contains a magic **link**. This
app instead asks the user to type a 6-digit **code**, so you need to tweak one
email template:

1. Dashboard → **Authentication → Email Templates → Reset Password**.
2. Replace the body so it shows the token instead of (or alongside) the link,
   e.g. include `{{ .Token }}` — that is the 6-digit code Supabase generates.
   Example line to add: `Your code is: {{ .Token }}`
3. Save. Now "Forgot password" in the app: user enters email → receives the
   code → enters it in-app → sets a new password.

## 7. Deploy the "Ask AI" edge function (optional but recommended)

The Ask AI tab calls a Supabase Edge Function so your AI provider key is
never exposed to the browser. Supabase's CLI is installed as a project
dependency and run through `npx`, so no extra package manager is required:

```bat
npm install -D supabase
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase functions deploy ask-ai
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

(Swap the last two commands for a different AI provider by editing
`supabase\functions\ask-ai\index.ts`.) If you skip this step, every other
part of the app still works — only the Ask AI tab needs it.

## 8. Push this project to GitHub (Windows Command Prompt)

1. On https://github.com, click **New repository**, name it `know-my-bike`,
   and leave "Add a README" **unchecked** (this project already has one) →
   **Create repository**. Copy the repository URL it shows you.
2. Back in Command Prompt, in the project folder:

```bat
git init
git add .
git commit -m "Initial commit: Know My Bike app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/know-my-bike.git
git push -u origin main
```

Enter your GitHub credentials (or a personal access token) if prompted.
`.env` is already listed in `.gitignore`, so your Supabase keys never get
pushed — only `.env.example` (with placeholder values) goes up.

Every time you make changes after this, push updates with:

```bat
git add .
git commit -m "Describe what changed"
git push
```

## 9. Deploy the web app for free (optional)

**Option A — Vercel**
1. https://vercel.com → New Project → import the `know-my-bike` repo you just
   pushed (framework: Vite).
2. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   in the Vercel project settings.
3. Deploy. `vercel.json` is already included so client-side routing works.

**Option B — Netlify**
1. https://netlify.com → New site from Git → same repo.
2. Build command: `npm run build`, publish directory: `dist`.
3. Add the same two environment variables.
4. `public\_redirects` is already included for SPA routing.

Either way you get a free `*.vercel.app` / `*.netlify.app` HTTPS URL. Add
that URL to Supabase's **Redirect URLs** (step 5) so Google login works in
production too.

## 10. Generate an Android APK (Windows)

The web app is wrapped into a real Android app using **Capacitor**, which
packages your built site inside a native shell you can install on any
Android phone. A ready-made `capacitor.config.json` (app id
`com.knowmybike.app`, app name `Know My Bike`) is already included, so you
can skip the interactive `npx cap init` step.

### 10.1 One-time setup

Install Android Studio from the link above and open it once so it can
download the Android SDK (accept the default "Standard" setup). You do not
need to install a separate JDK — Android Studio bundles one.

### 10.2 Build the web app and add the Android platform

```bat
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run android:add
```

`npm run android:add` creates a full native Android Studio project inside a
new `android\` folder (this folder is git-ignored on purpose — it's
regenerated from your web code, not something you hand-edit or commit).

### 10.3 Sync your code into the Android project

Run this again any time you change the app and rebuild:

```bat
npm run android:sync
```

### 10.4 Build the APK

**Option A — Android Studio (recommended, especially the first time):**

```bat
npm run android:open
```

This opens the `android` folder in Android Studio. Wait for "Gradle sync"
to finish (progress bar at the bottom), then:

`Build` menu → `Build Bundle(s) / APK(s)` → `Build APK(s)`

When it finishes, Android Studio shows a notification with a **locate**
link. The file is also always at:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

**Option B — Command Prompt only** (after Android Studio + SDK are already
installed once via Option A):

```bat
cd android
gradlew.bat assembleDebug
cd ..
```

Same output path as above.

### 10.5 Install the APK on your phone

Copy `app-debug.apk` to your phone (USB cable, email, Google Drive, etc.),
then on the phone enable "Install unknown apps" for whichever app you used
to open the file, and tap it to install.

### 10.6 (Optional) Build a signed release APK

A debug APK is fine for testing on your own phone. To share it more widely
or publish to the Play Store, build a **signed release** APK instead:

1. `npm run android:open` to open Android Studio.
2. `Build` menu → `Generate Signed Bundle / APK…` → choose **APK** → Next.
3. Click **Create new…** to generate a keystore the first time. Fill in a
   keystore path/password and your details, then **Next**.
4. Choose the **release** build variant → **Finish**.

The signed file lands in `android\app\release\app-release.apk`. Keep the
keystore file and its password somewhere safe outside the repo — losing it
means you can never publish an update to the same app listing again. It is
already excluded from git via `.gitignore` (`*.keystore`, `*.jks`).

### Notes on the Android build

- Your `.env` values are baked into the web bundle at `npm run build` time,
  so make sure `.env` is filled in correctly before running step 10.2 or
  10.3. Supabase's anon key is safe to ship in a client app — row-level
  security is what actually protects your data.
- To change the app icon/splash screen from the Capacitor defaults, add your
  own `icon.png` (1024×1024) and `splash.png` (2732×2732) to a `resources\`
  folder, then run `npx @capacitor/assets generate --android`.
- If `gradlew.bat` reports it can't find Java, set `JAVA_HOME` to Android
  Studio's bundled JDK and reopen Command Prompt:
  ```bat
  setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
  ```

## Project structure

```
src/
  context/      AuthContext, BikeContext, ThemeContext
  hooks/        useTable (per-bike realtime CRUD), useUserReport (whole-account stats)
  components/   Layout, BottomNav, Sheet, Fab, modals/
  pages/        Login, Signup, ForgotPassword, Onboarding,
                Garage, Logbook, Vault, AskAI, Profile
supabase/
  schema.sql            full DB schema + RLS + triggers
  functions/ask-ai/     edge function proxying the AI provider
capacitor.config.json   Android app id/name + web build folder (used when
                        generating the APK)
```
