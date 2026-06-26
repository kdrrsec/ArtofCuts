import { getGoogleReviews } from "./lib/google-reviews.js";
import { handleOptions, sendJson } from "./lib/http.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const data = await getGoogleReviews();
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return sendJson(res, 200, data);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      configured: false,
      reviews: [],
      rating: null,
      total: null,
      error: error.message || "Kon reviews niet laden",
    });
  }
}
