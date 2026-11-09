const fs = require('fs');
const path = require('path');
const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs release builds with the project's own keystore instead of whatever
 * `~/.android/debug.keystore` happens to contain.
 *
 * The keystore in `signing/` is a copy of the identity that is *already*
 * installed on the phone, so switching to it does not break the update path —
 * Android only allows in-place updates from the same key. If the file or its
 * properties are missing (fresh clone, CI), the build falls back to the debug
 * keystore rather than failing.
 */
const MARKER = 'PROOF_RELEASE_SIGNING';

const SIGNING_BLOCK = `
// ${MARKER}: see plugins/withReleaseSigning.js
// The keystore lives outside the generated android/ folder so prebuild never
// clobbers it, and the key is the one already installed on the phone.
def proofKeystoreProps = new File(rootProject.projectDir, "../signing/keystore.properties")
def proofHasReleaseSigning = proofKeystoreProps.exists() && new File(rootProject.projectDir, "../signing/proof.keystore").exists()
def proofKeystore = new Properties()
if (proofHasReleaseSigning) {
    proofKeystoreProps.withInputStream { proofKeystore.load(it) }
}
`;

const RELEASE_CONFIG = `
        if (proofHasReleaseSigning) {
            release {
                storeFile rootProject.file(proofKeystore.getProperty('storeFile').replace('../', ''))
                storePassword proofKeystore.getProperty('storePassword')
                keyAlias proofKeystore.getProperty('keyAlias')
                keyPassword proofKeystore.getProperty('keyPassword')
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning needs a Groovy build.gradle');
    }
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    // 1. defaults + keystore loader, before the android { } block
    src = src.replace(/^android\s*\{/m, `${SIGNING_BLOCK}\nandroid {`);

    // 2. add the release signing config next to the debug one
    src = src.replace(/(signingConfigs\s*\{)/m, `$1${RELEASE_CONFIG}`);

    // 3. point the release build type at it
    src = src.replace(
      /buildTypes\s*\{([\s\S]*?)release\s*\{([\s\S]*?)\}/m,
      (match) =>
        match.replace(
          /signingConfig\s+signingConfigs\.debug/,
          'signingConfig proofHasReleaseSigning ? signingConfigs.release : signingConfigs.debug',
        ),
    );

    cfg.modResults.contents = src;
    return cfg;
  });
};
