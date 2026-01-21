function isValidUrl(urlString) {
  try {
    const url = new URL(urlString.trim());
    if (url.protocol !== "https:") {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.startsWith("127.") || hostname.startsWith("192.168.") || hostname.startsWith("172.16.") || hostname === "[::1]" || hostname === "0.0.0.0") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
export {
  isValidUrl as i
};
