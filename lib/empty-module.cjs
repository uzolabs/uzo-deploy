// Stand-in for optional packages that wallet SDKs import but this app never calls.
// CommonJS so named imports resolve to undefined instead of failing the build.
// See turbopack.resolveAlias in next.config.ts.
module.exports = {}
