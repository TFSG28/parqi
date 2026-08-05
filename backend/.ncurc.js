// npm-check-updates config (used by `npm run update-deps`).
// https://github.com/raineorshine/npm-check-updates#config-files
//
// Hold TypeScript within its current major (5.x): TypeScript 7 (the native
// compiler) is not yet supported by typescript-eslint. Remove this pin once
// typescript-eslint publishes a release that supports the next major.
module.exports = {
    target: (dependencyName) =>
        dependencyName === 'typescript' ? 'minor' : 'latest',
};
