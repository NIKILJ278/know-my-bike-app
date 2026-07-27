// Patches android/app/src/main/AndroidManifest.xml to declare location
// permissions. The @capacitor/geolocation plugin's own bundled manifest
// is empty — its permission requests are wired up in Java via
// @Permission annotations, but Android still requires the permission to
// be *declared* in the app's own manifest before it can be requested at
// runtime at all. Without this, "Locate me" and the Speedometer would
// silently fail to get a real permission prompt. Runs automatically as
// part of `npm run android:add` (see package.json), same pattern as
// add-mic-permission.cjs, so it can't be silently skipped.

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error(`[add-location-permission] AndroidManifest.xml not found at ${manifestPath}`);
  console.error('[add-location-permission] Did "cap add android" run successfully first?');
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

const permissions = [
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
];

const toAdd = permissions.filter((p) => {
  const name = p.match(/android:name="([^"]+)"/)[1];
  return !xml.includes(name);
});

if (toAdd.length === 0) {
  console.log('[add-location-permission] Permissions already present, skipping.');
  process.exit(0);
}

const marker = '<application';
const idx = xml.indexOf(marker);
if (idx === -1) {
  console.error('[add-location-permission] Could not find <application> in AndroidManifest.xml');
  process.exit(1);
}

xml = xml.slice(0, idx) + toAdd.join('') + xml.slice(idx);
fs.writeFileSync(manifestPath, xml);
console.log('[add-location-permission] Added location permissions to AndroidManifest.xml');
