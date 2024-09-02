import moment from "moment";

export const getCurrentWeekRange = (customDate?: Date) => {
  console.log("CUSTOM DATE", customDate);
  const date = moment(customDate);
  let fromDate = date.clone().startOf("week").toDate();
  let toDate = date.clone().endOf("week").toDate();

  const startOfMonth = date.clone().startOf("month").toDate();
  const endOfMonth = date.clone().endOf("month").toDate();

  fromDate = fromDate < startOfMonth ? startOfMonth : fromDate;
  toDate = toDate > endOfMonth ? endOfMonth : toDate;

  return {
    fromDate: fromDate,
    toDate: toDate,
  };
};
