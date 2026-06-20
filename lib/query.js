export function getQuery(req) {
  if (req.query && typeof req.query === "object") {
    return req.query;
  }

  const raw = req.url || "";
  const queryString = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : raw;
  const params = new URLSearchParams(queryString);
  const query = {};

  for (const [key, value] of params.entries()) {
    query[key] = value;
  }

  return query;
}
