module.exports = function (api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            // The SDK is consumed as an installed package via a local `file:`
            // link (see package.json + metro.config.js) — no source alias.
            // App-local alias for the demo's own modules/assets.
            "@": "./",
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".png"],
        },
      ],
    ],
  }
}
