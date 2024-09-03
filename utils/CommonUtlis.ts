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
