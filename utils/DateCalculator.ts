import moment from "moment";

export const getCurrentWeekRange = (customDate?: Date) => {
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

export const getCurrentMonthRange = (customDate?: Date) => {
  const date = moment(customDate);
  let fromDate = date.clone().startOf("month").toDate();
  let toDate = date.clone().endOf("month").toDate();

  const startOfMonth = date.clone().startOf("month").toDate();
  const endOfMonth = date.clone().endOf("month").toDate();

  fromDate = fromDate < startOfMonth ? startOfMonth : fromDate;
  toDate = toDate > endOfMonth ? endOfMonth : toDate;

  return {
    fromDate: fromDate,
    toDate: toDate,
  };
};

export const formatDateTimeTimezone = (date: Date | null, format?: string) => {
  return moment(date || new Date()).format(format || "YYYY-MM-DD");
};

export const diffInDays = (fromDate: Date, toDate: Date) => {
  const from = moment(fromDate);
  const to = moment(toDate);
  const currentDate = moment(); // Current date

  // Check if the current date is within the range
  if (currentDate.isBetween(from, to, null, "[]")) {
    // '[]' includes the boundaries
    // Calculate the days left until toDate
    const daysLeft = to.diff(currentDate, "days");
    return `${daysLeft} Days Left`;
  }
};
