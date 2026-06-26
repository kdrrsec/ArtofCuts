const DEFAULT_PLACE_ID = "ChIJ61Gk9d19E0cR4v3W9bO3Kq8";
const DEFAULT_MAPS_URI =
  "https://www.google.com/maps/search/?api=1&query=Art+of+Cuts&query_place_id=ChIJ61Gk9d19E0cR4v3W9bO3Kq8";
const CACHE_MS = 60 * 60 * 1000;

let cachedPayload = null;
let cacheExpiresAt = 0;

function getApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || null;
}

function normalizePlaceId(value) {
  if (!value) return DEFAULT_PLACE_ID;
  return String(value).replace(/^places\//, "");
}

function normalizeReview(review) {
  const text = review?.text?.text || review?.originalText?.text || "";
  if (!text.trim()) return null;

  return {
    author: review?.authorAttribution?.displayName || "Google-gebruiker",
    rating: Number(review?.rating) || 0,
    text: text.trim(),
    time: review?.relativePublishTimeDescription || "",
    photoUri: review?.authorAttribution?.photoUri || null,
    publishedAt: review?.publishTime || null,
  };
}

function buildEmptyPayload(message) {
  return {
    configured: false,
    rating: null,
    total: null,
    googleMapsUri: DEFAULT_MAPS_URI,
    reviews: [],
    message,
  };
}

async function resolvePlaceId(apiKey) {
  const configuredId = normalizePlaceId(process.env.GOOGLE_PLACE_ID);
  if (process.env.GOOGLE_PLACE_ID) return configuredId;

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({
      textQuery: "Art of Cuts Walstraat 14 Arnhem",
      languageCode: "nl",
      regionCode: "NL",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Places zoeken mislukt (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const placeId = normalizePlaceId(data.places?.[0]?.id);
  if (!placeId) {
    throw new Error("Google Place ID niet gevonden voor Art of Cuts");
  }

  return placeId;
}

export async function getGoogleReviews() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return buildEmptyPayload("Google Places API-sleutel ontbreekt");
  }

  if (cachedPayload && Date.now() < cacheExpiresAt) {
    return cachedPayload;
  }

  const placeId = await resolvePlaceId(apiKey);
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews,googleMapsUri",
      "Accept-Language": "nl-NL",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google reviews ophalen mislukt (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const reviews = (data.reviews || [])
    .map(normalizeReview)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      }
      return 0;
    });

  const payload = {
    configured: true,
    placeId,
    placeName: data.displayName?.text || "Art of Cuts",
    rating: data.rating ?? null,
    total: data.userRatingCount ?? null,
    googleMapsUri: data.googleMapsUri || DEFAULT_MAPS_URI,
    reviews,
  };

  cachedPayload = payload;
  cacheExpiresAt = Date.now() + CACHE_MS;
  return payload;
}
