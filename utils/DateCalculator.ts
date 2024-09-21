import { store } from "@/redux/store";
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

export function getWeeklyDateRanges(endMonthFromCurrentMonth = 2) {
  const dateRanges: Array<{ fromDate: string; toDate: string }> = [];

  let fromDate = moment(store.getState().HomeSlice.dateRange.fromDate).startOf(
    "week"
  );
  let toDate = moment(store.getState().HomeSlice.dateRange.toDate).endOf(
    "week"
  );
  const endDate = moment()
    .add(endMonthFromCurrentMonth, "months")
    .startOf("month");

  while (fromDate.isBefore(endDate) && toDate.isBefore(endDate)) {
    dateRanges.push({
      fromDate: fromDate.format("YYYY-MM-DD"),
      toDate: toDate.format("YYYY-MM-DD"),
    });

    const diff = moment(toDate).diff(moment(fromDate), "days");

    fromDate = moment(fromDate).add(diff > 0 ? diff + 1 : diff, "days");
    toDate = moment(fromDate).endOf("week");
    if (moment(fromDate).endOf("month").isBefore(toDate)) {
      toDate = moment(fromDate).endOf("months");
    }
  }

  return dateRanges;
}

export function getMonthlyRanges(endMonthFromCurrentMonth = 2) {
  const dateRanges: Array<{ fromDate: string; toDate: string }> = [];
  let fromDate = moment(store.getState().HomeSlice.dateRange.fromDate).startOf(
    "month"
  );
  let toDate = moment(store.getState().HomeSlice.dateRange.toDate).endOf(
    "month"
  );

  const endDate = moment()
    .add(endMonthFromCurrentMonth, "months")
    .startOf("month");

  while (fromDate.isBefore(endDate) && toDate.isBefore(endDate)) {
    dateRanges.push({
      fromDate: fromDate.format("YYYY-MM-DD"),
      toDate: toDate.format("YYYY-MM-DD"),
    });

    fromDate = moment(fromDate).add(1, "month");
    toDate = moment(fromDate).endOf("month");
  }

  console.log({ dateRanges });
  return dateRanges;
}
