// Patches android/app/src/main/AndroidManifest.xml so the app can catch the
// "com.knowmybike.app://login-callback" redirect that Google OAuth sends back
// after the user approves sign-in in the system browser.
//
// Runs automatically as part of `npm run android:add` (see package.json), on
// both CI (Linux) and local machines (Windows/Mac), so this fix can never be
// silently skipped again.

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const SCHEME = 'com.knowmybike.app';

if (!fs.existsSync(manifestPath)) {
  console.error(`[add-oauth-redirect] AndroidManifest.xml not found at ${manifestPath}`);
  console.error('[add-oauth-redirect] Did "cap add android" run successfully first?');
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

if (xml.includes(`android:scheme="${SCHEME}"`)) {
  console.log('[add-oauth-redirect] Intent filter already present, skipping.');
  process.exit(0);
}

const intentFilter =
  '<intent-filter>' +
  '<action android:name="android.intent.action.VIEW" />' +
  '<category android:name="android.intent.category.DEFAULT" />' +
  '<category android:name="android.intent.category.BROWSABLE" />' +
  `<data android:scheme="${SCHEME}" />` +
  '</intent-filter>';

const marker = '</activity>';
const idx = xml.indexOf(marker);
if (idx === -1) {
  console.error('[add-oauth-redirect] Could not find </activity> in AndroidManifest.xml');
  process.exit(1);
}

xml = xml.slice(0, idx) + intentFilter + xml.slice(idx);
fs.writeFileSync(manifestPath, xml);
console.log('[add-oauth-redirect] Added OAuth deep-link intent filter to AndroidManifest.xml');
