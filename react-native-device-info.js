import * as Application from "expo-application";

// module.exports = {
//   getBundleId: function () {
//     return Constants.expoConfig?.ios?.bundleIdentifier;
//   },
//   getVersion: function () {
//     return Constants.expoConfig?.version;
//   },
// };

export const getVersion = () => {
  return Application.nativeApplicationVersion;
};

export const getBundleId = () => {
  return Application.nativeBuildVersion;
};
export default {
  getBundleId,
  getVersion,
};

// import Constants from "expo-constants";

// export const getBundleId = () => {
//   return Constants.expoConfig?.ios?.bundleIdentifier ?? "";
// };
// export const getVersion = () => {
//   return Constants.expoConfig?.version;
// };
// export default {
//   getBundleId,
//   getVersion,
// };
