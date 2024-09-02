import moment from "moment";

export const getCurrentWeekRange = (customDate?: Date) => {
  console.log("CUSTOM DATE",customDate);
  const fromDate = moment(customDate ?? new Date())
    .startOf("weeks")
    .toDate();
  const toDate = moment(customDate ?? new Date())
    .endOf("weeks")
    .toDate();

  return {
    fromDate: fromDate,
    toDate: toDate,
  };
};
