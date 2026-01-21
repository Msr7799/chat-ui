import { b as base } from "./server.js";
import "@sveltejs/kit/internal/server";
import { treaty } from "@elysiajs/eden";
import superjson from "superjson";
import ObjectId from "bson-objectid";
superjson.registerCustom(
  {
    isApplicable: (value) => {
      if (typeof value !== "string" && ObjectId.isValid(value)) {
        const str = value.toString();
        return /^[0-9a-fA-F]{24}$/.test(str);
      }
      return false;
    },
    serialize: (value) => value.toString(),
    deserialize: (value) => new ObjectId(value)
  },
  "ObjectId"
);
function useAPIClient({
  fetch,
  origin
} = {}) {
  const url = `${origin ?? `http://localhost:5173`}${base}/api/v2`;
  const app = treaty(url, { fetcher: fetch });
  return app;
}
function handleResponse(response) {
  if (response.error) {
    throw new Error(JSON.stringify(response.error));
  }
  return superjson.parse(
    typeof response.data === "string" ? response.data : JSON.stringify(response.data)
  );
}
export {
  handleResponse as h,
  useAPIClient as u
};
