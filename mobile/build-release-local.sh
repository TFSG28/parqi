#!/usr/bin/env bash
# Build de verificação local do APK release assinado (log: mobile/build-local.log)
cd "$(dirname "$0")/android" || exit 1
export JAVA_HOME="/c/Users/Utilizador/AppData/Local/Programs/Eclipse Adoptium/jdk-17.0.15.6-hotspot"
export PARQI_STORE_PASSWORD="$(cat ../keystore/PASSWORD.txt)"
export PARQI_KEY_ALIAS=parqi
export PARQI_KEY_PASSWORD="$(cat ../keystore/PASSWORD.txt)"
./gradlew assembleRelease --no-daemon > ../build-local.log 2>&1
echo "EXIT=$?" >> ../build-local.log
