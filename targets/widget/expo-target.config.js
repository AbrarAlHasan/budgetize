/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: 'https://github.com/expo.png',
  entitlements: {
    // Use the same app groups as the main app
    "com.apple.security.application-groups": 
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});