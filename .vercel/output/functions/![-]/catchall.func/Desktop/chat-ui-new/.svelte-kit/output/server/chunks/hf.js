const hasAuthHeader = (h) => !!h && Object.keys(h).some((k) => k.toLowerCase() === "authorization");
const isStrictHfMcpLogin = (urlString) => {
  try {
    const u = new URL(urlString);
    const host = u.hostname.toLowerCase();
    const allowedHosts = /* @__PURE__ */ new Set(["hf.co", "huggingface.co"]);
    return u.protocol === "https:" && allowedHosts.has(host) && u.pathname === "/mcp" && u.search === "?login";
  } catch {
    return false;
  }
};
const hasNonEmptyToken = (tok) => typeof tok === "string" && tok.trim().length > 0;
export {
  hasAuthHeader as a,
  hasNonEmptyToken as h,
  isStrictHfMcpLogin as i
};
