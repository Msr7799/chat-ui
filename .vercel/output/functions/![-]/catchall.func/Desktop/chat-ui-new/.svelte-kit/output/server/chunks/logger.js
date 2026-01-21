import pino from "pino";
import { c as config } from "./config.js";
let options = {};
const logger = pino({
  ...options,
  level: config.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});
export {
  logger as l
};
