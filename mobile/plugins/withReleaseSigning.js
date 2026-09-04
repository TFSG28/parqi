/**
 * Config plugin: injeta a signing config de release no android/app/build.gradle
 * gerado pelo prebuild (CNG). As credenciais vêm de variáveis de ambiente:
 *
 *   PARQI_STORE_FILE      caminho do keystore (default: ../../keystore/parqi-release.keystore)
 *   PARQI_STORE_PASSWORD  password do keystore
 *   PARQI_KEY_ALIAS       alias da chave (default: parqi)
 *   PARQI_KEY_PASSWORD    password da chave
 *
 * Sem estas vars, `assembleRelease` falha — o debug continua a funcionar como sempre.
 * Anexa um segundo bloco `android { }` ao build.gradle (Groovy reavalia o mesmo
 * objeto, last-wins), evitando regexes frágeis sobre o template do Expo.
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const signingBlock = `
// ── withReleaseSigning (plugins/withReleaseSigning.js) ──────────────────────
android {
    signingConfigs {
        release {
            def storeFilePath = System.getenv("PARQI_STORE_FILE") ?: "../../keystore/parqi-release.keystore"
            storeFile file(storeFilePath)
            storePassword System.getenv("PARQI_STORE_PASSWORD")
            keyAlias System.getenv("PARQI_KEY_ALIAS") ?: "parqi"
            keyPassword System.getenv("PARQI_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
// ────────────────────────────────────────────────────────────────────────────
`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes("withReleaseSigning")) {
      mod.modResults.contents += signingBlock;
    }
    return mod;
  });
}

module.exports = withReleaseSigning;
