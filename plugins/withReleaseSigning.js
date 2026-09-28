// Signs release builds with the keystore described in `credentials/keystore.properties`
// (not committed). Without that file, release builds fall back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const SNIPPET = `
    def lfKeystoreProps = new Properties()
    def lfKeystoreFile = rootProject.file('../credentials/keystore.properties')
    if (lfKeystoreFile.exists()) { lfKeystoreFile.withInputStream { lfKeystoreProps.load(it) } }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, cfg => {
    let g = cfg.modResults.contents;
    if (g.includes('lfKeystoreProps')) return cfg;
    g = g.replace(/android\s*\{/, m => m + SNIPPET);
    g = g.replace(/signingConfigs\s*\{/, m => m + `
        release {
            if (lfKeystoreFile.exists()) {
                storeFile rootProject.file('../credentials/' + lfKeystoreProps['storeFile'])
                storePassword lfKeystoreProps['storePassword']
                keyAlias lfKeystoreProps['keyAlias']
                keyPassword lfKeystoreProps['keyPassword']
            }
        }`);
    g = g.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig lfKeystoreFile.exists() ? signingConfigs.release : signingConfigs.debug');
    cfg.modResults.contents = g;
    return cfg;
  });
};
