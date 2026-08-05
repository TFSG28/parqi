// npm-check-updates config (used by `npm run update-deps`).
// https://github.com/raineorshine/npm-check-updates#config-files
//
// Hold within the current major for tools the Next lint toolchain lags behind:
//  - typescript: TS 7 (native compiler) not yet supported by typescript-eslint
//  - eslint: eslint-config-next 16.x bundles plugins that peer-support eslint 9
// Remove entries here once eslint-config-next supports the next majors.
const HOLD_AT_MINOR = ['typescript', 'eslint'];

module.exports = {
    target: (dependencyName) =>
        HOLD_AT_MINOR.includes(dependencyName) ? 'minor' : 'latest',
};
