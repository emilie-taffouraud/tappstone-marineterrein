import app from "../server.js";

export default function handler(req, res) {
  const url = new URL(req.url, "https://vercel.local");
  const rewrittenPath = url.searchParams.get("path");

  if (rewrittenPath) {
    url.searchParams.delete("path");
    const query = url.searchParams.toString();
    req.url = `/api/${rewrittenPath}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
}
