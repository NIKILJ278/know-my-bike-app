// Patches android/app/src/main/AndroidManifest.xml to declare microphone
// permission, needed for the push-to-talk voice notes in Rides. Runs
// automatically as part of `npm run android:add` (see package.json), same
// pattern as add-oauth-redirect.cjs, so it can't be silently skipped.

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error(`[add-mic-permission] AndroidManifest.xml not found at ${manifestPath}`);
  console.error('[add-mic-permission] Did "cap add android" run successfully first?');
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

const permissions = [
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
];

const toAdd = permissions.filter((p) => {
  const name = p.match(/android:name="([^"]+)"/)[1];
  return !xml.includes(name);
});

if (toAdd.length === 0) {
  console.log('[add-mic-permission] Permissions already present, skipping.');
  process.exit(0);
}

const marker = '<application';
const idx = xml.indexOf(marker);
if (idx === -1) {
  console.error('[add-mic-permission] Could not find <application> in AndroidManifest.xml');
  process.exit(1);
}

xml = xml.slice(0, idx) + toAdd.join('') + xml.slice(idx);
fs.writeFileSync(manifestPath, xml);
console.log('[add-mic-permission] Added microphone permissions to AndroidManifest.xml');
