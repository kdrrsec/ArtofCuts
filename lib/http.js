export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(data));
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error("Body te groot"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Ongeldige JSON"));
      }
    });
    req.on("error", reject);
  });
}

export function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return true;
  }
  return false;
}
