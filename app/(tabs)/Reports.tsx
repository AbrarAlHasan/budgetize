import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { WeeklyBarChart } from "@/components/Reports/WeeklyBarChart";
import { BACKGROUND_COLOR, data } from "@/components/Reports/constants";
import { supabase } from "@/lib/supabase";
import { store } from "@/redux/store";
import ComingSoonReport from "@/components/Reports/ComingSoonReport";
import ComingSoon from "@/components/ComingSoon";
const Reports = () => {
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // const response = await supabase.functions('get_weekly_grouped_transactions')
    const response = await supabase.functions.invoke(
      "get_weekly_grouped_transactions",
      {
        body: { userId: store.getState().AuthSlice.userDetails?.user_id },
      }
    );
  };
  return (
    <>
      {/* <View style={{ flex: 1, padding: 20 }}>
        <WeeklyBarChart
          weeks={data}
          activeWeekIndex={activeWeekIndex}
          onWeekChange={setActiveWeekIndex}
        />
      </View> */}
      <ComingSoon renderBackground={() => <ComingSoonReport />} />
    </>
  );
};

export default Reports;

const styles = StyleSheet.create({});
