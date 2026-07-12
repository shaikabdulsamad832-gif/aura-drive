const express = require("express");
const axios = require("axios");

const router = express.Router();

const OLA_BASE_URL = "https://api.olamaps.io";

const getApiKey = () =>
  process.env.OLA_MAPS_API_KEY ||
  process.env.OLA_API_KEY ||
  process.env.OLA_KEY;

const firstText = (...values) =>
  values.find(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0
  ) || "";

const toNumber = (...values) => {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
};

const validLat = (value) => {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= -90 &&
    number <= 90
  );
};

const validLng = (value) => {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= -180 &&
    number <= 180
  );
};

const extractCoordinates = (item) => {
  if (!item || typeof item !== "object") {
    return { lat: null, lng: null };
  }

  const objects = [
    item?.geometry?.location,
    item?.location,
    item?.position,
    item?.geometry,
    item?.address?.location,
  ];

  for (const object of objects) {
    if (!object || Array.isArray(object)) {
      continue;
    }

    const lat = toNumber(
      object?.lat,
      object?.latitude,
      object?.y
    );

    const lng = toNumber(
      object?.lng,
      object?.lon,
      object?.longitude,
      object?.x
    );

    if (validLat(lat) && validLng(lng)) {
      return {
        lat: Number(lat),
        lng: Number(lng),
      };
    }
  }

  const arrays = [
    item?.geometry?.coordinates,
    item?.location?.coordinates,
    item?.position?.coordinates,
    Array.isArray(item?.coordinates)
      ? item.coordinates
      : null,
  ];

  for (const coordinates of arrays) {
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    ) {
      continue;
    }

    const geoLng = Number(coordinates[0]);
    const geoLat = Number(coordinates[1]);

    if (validLat(geoLat) && validLng(geoLng)) {
      return {
        lat: geoLat,
        lng: geoLng,
      };
    }

    const alternateLat = Number(coordinates[0]);
    const alternateLng = Number(coordinates[1]);

    if (
      validLat(alternateLat) &&
      validLng(alternateLng)
    ) {
      return {
        lat: alternateLat,
        lng: alternateLng,
      };
    }
  }

  const lat = toNumber(item?.lat, item?.latitude);
  const lng = toNumber(
    item?.lng,
    item?.lon,
    item?.longitude
  );

  if (validLat(lat) && validLng(lng)) {
    return {
      lat: Number(lat),
      lng: Number(lng),
    };
  }

  return { lat: null, lng: null };
};

const extractArray = (data) => {
  const arrays = [
    data?.predictions,
    data?.suggestions,
    data?.results,
    data?.items,
    data?.places,
    data?.data?.predictions,
    data?.data?.suggestions,
    data?.data?.results,
    data?.data?.items,
    data?.data?.places,
    Array.isArray(data?.data) ? data.data : null,
    Array.isArray(data) ? data : null,
  ];

  return arrays.find(Array.isArray) || [];
};

const normalizePrediction = (item, index) => {
  const coordinates = extractCoordinates(item);

  const mainText = firstText(
    item?.structured_formatting?.main_text,
    item?.structuredFormatting?.mainText,
    item?.primary_text,
    item?.primaryText,
    item?.name,
    item?.title,
    item?.place_name,
    item?.address?.name
  );

  const secondaryText = firstText(
    item?.structured_formatting?.secondary_text,
    item?.structuredFormatting?.secondaryText,
    item?.secondary_text,
    item?.secondaryText,
    typeof item?.address === "string"
      ? item.address
      : "",
    item?.formatted_address,
    item?.formattedAddress,
    item?.vicinity,
    item?.subtitle
  );

  const description = firstText(
    item?.description,
    item?.formatted_address,
    item?.formattedAddress,
    item?.full_address,
    item?.fullAddress,
    item?.display_name,
    item?.displayName,
    [mainText, secondaryText]
      .filter(Boolean)
      .join(", "),
    mainText
  );

  return {
    place_id:
      item?.place_id ||
      item?.placeId ||
      item?.id ||
      item?.reference ||
      `aura-place-${index}`,
    description: description || "Unknown location",
    structured_formatting: {
      main_text:
        mainText ||
        description ||
        "Location",
      secondary_text:
        secondaryText &&
        secondaryText !== mainText
          ? secondaryText
          : "",
    },
    geometry: {
      location: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
    },
  };
};

const normalizeResolvedPlace = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const coordinates = extractCoordinates(item);

  const name = firstText(
    item?.formatted_address,
    item?.formattedAddress,
    item?.full_address,
    item?.fullAddress,
    item?.display_name,
    item?.displayName,
    item?.description,
    typeof item?.address === "string"
      ? item.address
      : "",
    item?.name,
    item?.title
  );

  if (
    !name ||
    !validLat(coordinates.lat) ||
    !validLng(coordinates.lng)
  ) {
    return null;
  }

  return {
    name,
    formatted_address: name,
    lat: Number(coordinates.lat),
    lng: Number(coordinates.lng),
  };
};

const extractResolvedPlace = (data) => {
  const array = extractArray(data);

  for (const item of array) {
    const place = normalizeResolvedPlace(item);

    if (place) {
      return place;
    }
  }

  const singles = [
    data?.result,
    data?.place,
    data?.data?.result,
    data?.data?.place,
    data?.data,
  ];

  for (const item of singles) {
    const place = normalizeResolvedPlace(item);

    if (place) {
      return place;
    }
  }

  return null;
};

const haversine = (lat1, lng1, lat2, lng2) => {
  if (
    !validLat(lat1) ||
    !validLng(lng1) ||
    !validLat(lat2) ||
    !validLng(lng2)
  ) {
    return null;
  }

  const radius = 6371;
  const dLat =
    ((Number(lat2) - Number(lat1)) * Math.PI) /
    180;
  const dLng =
    ((Number(lng2) - Number(lng1)) * Math.PI) /
    180;

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return (
    radius *
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    )
  );
};

const scorePrediction = (
  prediction,
  query,
  centerLat,
  centerLng
) => {
  const normalizedQuery = query
    .trim()
    .toLowerCase();

  const mainText =
    prediction.structured_formatting.main_text.toLowerCase();

  const description =
    prediction.description.toLowerCase();

  let score = 0;

  if (mainText === normalizedQuery) score += 300;
  if (mainText.startsWith(normalizedQuery))
    score += 180;
  if (description.startsWith(normalizedQuery))
    score += 120;
  if (mainText.includes(normalizedQuery))
    score += 90;
  if (description.includes(normalizedQuery))
    score += 60;

  normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      if (mainText.includes(word)) score += 25;
      if (description.includes(word)) score += 12;
    });

  const lat =
    prediction.geometry.location.lat;
  const lng =
    prediction.geometry.location.lng;

  const distance = haversine(
    centerLat,
    centerLng,
    lat,
    lng
  );

  if (distance !== null) {
    if (distance <= 5) score += 80;
    else if (distance <= 15) score += 55;
    else if (distance <= 40) score += 30;
    else if (distance <= 100) score += 10;
    else if (distance > 300) score -= 80;
  }

  return score;
};

const uniquePredictions = (predictions) => {
  const seen = new Set();

  return predictions.filter((prediction) => {
    const key = [
      prediction.place_id,
      prediction.description,
    ]
      .join("|")
      .toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Aura Drive Ola routes working",
  });
});

router.get("/search", async (req, res) => {
  try {
    const query = String(
      req.query.query ||
        req.query.input ||
        ""
    ).trim();

    if (query.length < 2) {
      return res.json({
        success: true,
        predictions: [],
      });
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message:
          "OLA_MAPS_API_KEY is missing in server .env",
        predictions: [],
      });
    }

    const centerLat = Number(req.query.lat);
    const centerLng = Number(req.query.lng);

    const params = {
      input: query,
      api_key: apiKey,
      language: "en",
    };

    if (
      validLat(centerLat) &&
      validLng(centerLng)
    ) {
      params.location = `${centerLat},${centerLng}`;
      params.radius = 50000;
    }

    const response = await axios.get(
      `${OLA_BASE_URL}/places/v1/autocomplete`,
      {
        params,
        headers: {
          Accept: "application/json",
          "X-Request-Id": `aura-search-${Date.now()}`,
        },
        timeout: 15000,
      }
    );

    const predictions = uniquePredictions(
      extractArray(response.data)
        .map(normalizePrediction)
        .filter(
          (prediction) =>
            prediction.description &&
            prediction.description !==
              "Unknown location"
        )
        .map((prediction) => ({
          ...prediction,
          score: scorePrediction(
            prediction,
            query,
            centerLat,
            centerLng
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ score, ...prediction }) => prediction)
    );

    return res.json({
      success: true,
      predictions,
    });
  } catch (error) {
    console.error(
      "Ola search error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json({
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to search locations",
        predictions: [],
      });
  }
});

router.get("/resolve-place", async (req, res) => {
  try {
    const description = String(
      req.query.description || ""
    ).trim();

    const suppliedLat = Number(req.query.lat);
    const suppliedLng = Number(req.query.lng);

    if (!description) {
      return res.status(400).json({
        success: false,
        message:
          "Place description is required",
      });
    }

    if (
      validLat(suppliedLat) &&
      validLng(suppliedLng)
    ) {
      return res.json({
        success: true,
        source: "autocomplete",
        location: {
          name: description,
          formatted_address: description,
          lat: suppliedLat,
          lng: suppliedLng,
        },
      });
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message:
          "OLA_MAPS_API_KEY is missing in server .env",
      });
    }

    const response = await axios.get(
      `${OLA_BASE_URL}/places/v1/geocode`,
      {
        params: {
          address: description,
          api_key: apiKey,
          language: "en",
        },
        headers: {
          Accept: "application/json",
          "X-Request-Id": `aura-resolve-${Date.now()}`,
        },
        timeout: 15000,
      }
    );

    const resolvedPlace =
      extractResolvedPlace(response.data);

    if (!resolvedPlace) {
      return res.status(404).json({
        success: false,
        message:
          "Selected place did not return valid coordinates",
      });
    }

    return res.json({
      success: true,
      source: "geocode",
      location: resolvedPlace,
    });
  } catch (error) {
    console.error(
      "Resolve place error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json({
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to resolve selected place",
      });
  }
});

router.get("/reverse", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!validLat(lat) || !validLng(lng)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid latitude and longitude are required",
        results: [],
      });
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message:
          "OLA_MAPS_API_KEY is missing in server .env",
        results: [],
      });
    }

    const response = await axios.get(
      `${OLA_BASE_URL}/places/v1/reverse-geocode`,
      {
        params: {
          latlng: `${lat},${lng}`,
          api_key: apiKey,
          language: "en",
        },
        headers: {
          Accept: "application/json",
          "X-Request-Id": `aura-reverse-${Date.now()}`,
        },
        timeout: 15000,
      }
    );

    const results = [];

    for (const item of extractArray(response.data)) {
      const place = normalizeResolvedPlace(item);

      if (place) {
        results.push({
          formatted_address: place.name,
          name: place.name,
          geometry: {
            location: {
              lat: place.lat,
              lng: place.lng,
            },
          },
        });
      }
    }

    if (results.length === 0) {
      const place =
        extractResolvedPlace(response.data);

      if (place) {
        results.push({
          formatted_address: place.name,
          name: place.name,
          geometry: {
            location: {
              lat: place.lat,
              lng: place.lng,
            },
          },
        });
      }
    }

    return res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(
      "Ola reverse error:",
      error.response?.data || error.message
    );

    return res
      .status(error.response?.status || 500)
      .json({
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to find address",
        results: [],
      });
  }
});

module.exports = router;