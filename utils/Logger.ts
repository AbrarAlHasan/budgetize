import { supabase } from "@/lib/supabase";
import { store } from "@/redux/store";
import {
  consoleTransport,
  logger,
  transportFunctionType,
} from "react-native-logs";

const customTransport: transportFunctionType<any> = (props) => {
  const authDetails = store.getState().AuthSlice;

  supabase.from("error_logger").insert({
    error: {
      userDetails: authDetails,
      message: props?.msg,
      rawMessage: props?.rawMsg,
    },
  });
};

var log = logger.createLogger({
  transport: __DEV__ ? consoleTransport : customTransport,
  transportOptions: {
    colors: {
      info: "blueBright",
      warn: "yellowBright",
      error: "redBright",
    },
    extensionColors: {
      root: "magenta",
      home: "green",
    },
  },
});
var rootLog = log.extend("root");
var homeLog = log.extend("home");

export { rootLog, homeLog };
export default log;
