export const groupData = (data: any, key: string) => {
  const hashedData: any = {};

  data?.map((item: any) => {
    if (hashedData[item[key]] === undefined) {
      hashedData[item[key]] = [item];
    } else {
      const data = hashedData[item[key]];
      data.push(item);

      hashedData[item[key]] = data;
    }
  });
  return hashedData;
};

export function compareVersions(version1: string, version2: string) {
  const v1 = version1.split(".").map(Number);
  const v2 = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 > num2) {
      return true;
    } else if (num1 < num2) {
      return false;
    }
  }

  return false; // Both versions are equal
}
