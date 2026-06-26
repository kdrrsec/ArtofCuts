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
    const fallback = {
      configured: true,
      source: "manual",
      reviews: [],
      rating: null,
      total: null,
      googleMapsUri: "https://www.google.com/maps/search/?api=1&query=Art+of+Cuts&query_place_id=ChIJ61Gk9d19E0cR4v3W9bO3Kq8",
      error: error.message || "Kon reviews niet laden",
    };
    return sendJson(res, 200, fallback);
  }
}
