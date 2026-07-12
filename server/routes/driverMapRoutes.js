const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const router = express.Router();

const OLA_DIRECTIONS_URL =
  "https://api.olamaps.io/routing/v1/directions/basic";

const getOlaApiKey = () =>
  process.env.OLA_MAPS_API_KEY ||
  process.env.OLA_API_KEY ||
  process.env.OLA_KEY;

const isValidLatitude = (value) => {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= -90 &&
    number <= 90
  );
};

const isValidLongitude = (value) => {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= -180 &&
    number <= 180
  );
};

const decodePolyline = (encoded, precision = 5) => {
  if (
    typeof encoded !== "string" ||
    encoded.length === 0
  ) {
    return [];
  }

  const coordinates = [];
  const factor = 10 ** precision;

  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      if (index >= encoded.length) {
        return coordinates;
      }

      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);

    latitude +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    result = 0;
    shift = 0;

    do {
      if (index >= encoded.length) {
        return coordinates;
      }

      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);

    longitude +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    coordinates.push([
      longitude / factor,
      latitude / factor,
    ]);
  }

  return coordinates;
};

const normalizeCoordinatePair = (coordinate) => {
  if (
    !Array.isArray(coordinate) ||
    coordinate.length < 2
  ) {
    return null;
  }

  const first = Number(coordinate[0]);
  const second = Number(coordinate[1]);

  if (
    !Number.isFinite(first) ||
    !Number.isFinite(second)
  ) {
    return null;
  }

  if (
    isValidLongitude(first) &&
    isValidLatitude(second)
  ) {
    return [first, second];
  }

  if (
    isValidLatitude(first) &&
    isValidLongitude(second)
  ) {
    return [second, first];
  }

  return null;
};

const normalizeCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .map(normalizeCoordinatePair)
    .filter(Boolean);
};

const removeDuplicateCoordinates = (coordinates) => {
  const result = [];

  coordinates.forEach((coordinate) => {
    if (!coordinate) {
      return;
    }

    const previous = result[result.length - 1];

    if (
      previous &&
      Math.abs(previous[0] - coordinate[0]) <
        0.000001 &&
      Math.abs(previous[1] - coordinate[1]) <
        0.000001
    ) {
      return;
    }

    result.push(coordinate);
  });

  return result;
};

const getRoutes = (data) => {
  const candidates = [
    data?.routes,
    data?.data?.routes,
    data?.result?.routes,
    data?.data?.result?.routes,
  ];

  return candidates.find(Array.isArray) || [];
};

const getRoute = (data) =>
  getRoutes(data)[0] || null;

const isUsableRoute = (coordinates) => {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 3 &&
    coordinates.every(
      (coordinate) =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        isValidLongitude(coordinate[0]) &&
        isValidLatitude(coordinate[1])
    )
  );
};

const decodeEncodedRoute = (encoded) => {
  if (
    typeof encoded !== "string" ||
    encoded.length === 0
  ) {
    return [];
  }

  const precisionFive = removeDuplicateCoordinates(
    decodePolyline(encoded, 5)
  );

  if (isUsableRoute(precisionFive)) {
    return precisionFive;
  }

  const precisionSix = removeDuplicateCoordinates(
    decodePolyline(encoded, 6)
  );

  if (isUsableRoute(precisionSix)) {
    return precisionSix;
  }

  return [];
};

const extractCoordinatesFromSteps = (route) => {
  const result = [];

  const legs = Array.isArray(route?.legs)
    ? route.legs
    : [];

  legs.forEach((leg) => {
    const steps = Array.isArray(leg?.steps)
      ? leg.steps
      : [];

    steps.forEach((step) => {
      const coordinateArrays = [
        step?.geometry?.coordinates,
        step?.polyline?.coordinates,
        step?.coordinates,
      ];

      coordinateArrays.forEach((candidate) => {
        const coordinates =
          normalizeCoordinates(candidate);

        if (coordinates.length > 0) {
          result.push(...coordinates);
        }
      });

      const encodedCandidates = [
        typeof step?.geometry === "string"
          ? step.geometry
          : null,
        typeof step?.polyline === "string"
          ? step.polyline
          : null,
        typeof step?.overview_polyline === "string"
          ? step.overview_polyline
          : null,
        step?.geometry?.points,
        step?.polyline?.points,
        step?.overview_polyline?.points,
        step?.overviewPolyline?.points,
        step?.encoded_polyline,
        step?.encodedPolyline,
      ];

      encodedCandidates.forEach((encoded) => {
        const coordinates =
          decodeEncodedRoute(encoded);

        if (coordinates.length > 0) {
          result.push(...coordinates);
        }
      });
    });
  });

  return removeDuplicateCoordinates(result);
};

const extractRouteCoordinates = (route) => {
  if (!route) {
    return [];
  }

  const coordinateArrays = [
    route?.geometry?.coordinates,
    route?.polyline?.coordinates,
    route?.overview_polyline?.coordinates,
    route?.overviewPolyline?.coordinates,
    route?.route_geometry?.coordinates,
    route?.routeGeometry?.coordinates,
    route?.coordinates,
  ];

  for (const candidate of coordinateArrays) {
    const coordinates =
      removeDuplicateCoordinates(
        normalizeCoordinates(candidate)
      );

    if (isUsableRoute(coordinates)) {
      return coordinates;
    }
  }

  const encodedCandidates = [
    typeof route?.geometry === "string"
      ? route.geometry
      : null,
    typeof route?.polyline === "string"
      ? route.polyline
      : null,
    typeof route?.overview_polyline === "string"
      ? route.overview_polyline
      : null,
    typeof route?.overviewPolyline === "string"
      ? route.overviewPolyline
      : null,
    route?.geometry?.points,
    route?.polyline?.points,
    route?.overview_polyline?.points,
    route?.overviewPolyline?.points,
    route?.encoded_polyline,
    route?.encodedPolyline,
  ];

  for (const encoded of encodedCandidates) {
    const coordinates =
      decodeEncodedRoute(encoded);

    if (isUsableRoute(coordinates)) {
      return coordinates;
    }
  }

  const stepCoordinates =
    extractCoordinatesFromSteps(route);

  if (isUsableRoute(stepCoordinates)) {
    return stepCoordinates;
  }

  return [];
};

const sumLegValue = (route, field) => {
  const legs = Array.isArray(route?.legs)
    ? route.legs
    : [];

  return legs.reduce((total, leg) => {
    const value = Number(leg?.[field]);

    return (
      total +
      (Number.isFinite(value) ? value : 0)
    );
  }, 0);
};

const getDistanceMeters = (route) => {
  const candidates = [
    route?.distance,
    route?.summary?.distance,
    route?.distance_meters,
    route?.distanceMeters,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return sumLegValue(route, "distance");
};

const getDurationSeconds = (route) => {
  const candidates = [
    route?.duration,
    route?.summary?.duration,
    route?.duration_seconds,
    route?.durationSeconds,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return sumLegValue(route, "duration");
};

const getNavigationSteps = (route) => {
  const navigationSteps = [];

  const legs = Array.isArray(route?.legs)
    ? route.legs
    : [];

  legs.forEach((leg) => {
    const steps = Array.isArray(leg?.steps)
      ? leg.steps
      : [];

    steps.forEach((step, index) => {
      const instruction =
        step?.navigation_instruction
          ?.instructions ||
        step?.navigationInstruction
          ?.instructions ||
        step?.html_instructions ||
        step?.maneuver?.instruction ||
        step?.instruction ||
        step?.name ||
        "Continue on the road";

      const maneuver =
        step?.navigation_instruction
          ?.maneuver ||
        step?.navigationInstruction
          ?.maneuver ||
        step?.maneuver?.type ||
        "continue";

      navigationSteps.push({
        id: `${navigationSteps.length}-${index}`,
        instruction,
        maneuver,
        distanceMeters:
          Number(step?.distance) || 0,
        durationSeconds:
          Number(step?.duration) || 0,
      });
    });
  });

  return navigationSteps;
};

const requestOlaRoute = async ({
  apiKey,
  origin,
  destination,
  includeOptions,
}) => {
  const params = {
    origin,
    destination,
    api_key: apiKey,
  };

  if (includeOptions) {
    params.alternatives = "false";
    params.steps = "true";
    params.overview = "full";
    params.language = "en";
    params.route_preference = "fastest";
  }

  const requestId =
    `aura-${Date.now()}-${crypto
      .randomBytes(5)
      .toString("hex")}`;

  return axios.post(
    OLA_DIRECTIONS_URL,
    {},
    {
      params,
      headers: {
        Accept: "application/json",
        "X-Request-Id": requestId,
        "X-Correlation-Id": requestId,
      },
      timeout: 20000,
      validateStatus: (status) =>
        status >= 200 && status < 500,
    }
  );
};

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "Aura Drive driver map routes are working",
    timestamp: new Date().toISOString(),
  });
});

router.get("/directions", async (req, res) => {
  const originLat = Number(
    req.query.originLat
  );

  const originLng = Number(
    req.query.originLng
  );

  const destinationLat = Number(
    req.query.destinationLat
  );

  const destinationLng = Number(
    req.query.destinationLng
  );

  if (
    !isValidLatitude(originLat) ||
    !isValidLongitude(originLng) ||
    !isValidLatitude(destinationLat) ||
    !isValidLongitude(destinationLng)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid origin and destination coordinates are required",
      coordinates: [],
      instructions: [],
      distanceKm: 0,
      durationMinutes: 0,
    });
  }

  const apiKey = getOlaApiKey();

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message:
        "OLA_API_KEY is missing in the server .env file",
      coordinates: [],
      instructions: [],
      distanceKm: 0,
      durationMinutes: 0,
    });
  }

  const origin =
    `${originLat.toFixed(6)},` +
    `${originLng.toFixed(6)}`;

  const destination =
    `${destinationLat.toFixed(6)},` +
    `${destinationLng.toFixed(6)}`;

  try {
    let response = await requestOlaRoute({
      apiKey,
      origin,
      destination,
      includeOptions: true,
    });

    if (response.status === 400) {
      response = await requestOlaRoute({
        apiKey,
        origin,
        destination,
        includeOptions: false,
      });
    }

    if (
      response.status < 200 ||
      response.status >= 300
    ) {
      console.error(
        "Ola Maps directions error:",
        response.status,
        response.data
      );

      return res
        .status(response.status)
        .json({
          success: false,
          message:
            response.data?.reason ||
            response.data?.message ||
            response.data?.error ||
            "Ola Maps rejected the route request",
          details: response.data,
          coordinates: [],
          instructions: [],
          distanceKm: 0,
          durationMinutes: 0,
        });
    }

    const route = getRoute(response.data);

    if (!route) {
      console.error(
        "Ola route missing:",
        JSON.stringify(response.data)
      );

      return res.status(404).json({
        success: false,
        message:
          "Ola Maps did not return a route",
        coordinates: [],
        instructions: [],
        distanceKm: 0,
        durationMinutes: 0,
      });
    }

    const coordinates =
      extractRouteCoordinates(route);

    if (!isUsableRoute(coordinates)) {
      console.error(
        "Ola route geometry missing:",
        JSON.stringify(response.data)
      );

      return res.status(422).json({
        success: false,
        message:
          "Ola Maps returned route information without usable road geometry",
        coordinates: [],
        instructions: [],
        distanceKm: 0,
        durationMinutes: 0,
      });
    }

    const distanceMeters =
      getDistanceMeters(route);

    const durationSeconds =
      getDurationSeconds(route);

    return res.status(200).json({
      success: true,
      routeType: "road",
      coordinates,
      instructions:
        getNavigationSteps(route),
      distanceMeters,
      distanceKm:
        distanceMeters > 0
          ? Number(
              (
                distanceMeters / 1000
              ).toFixed(2)
            )
          : 0,
      durationSeconds,
      durationMinutes:
        durationSeconds > 0
          ? Math.max(
              1,
              Math.round(
                durationSeconds / 60
              )
            )
          : 0,
      origin: {
        lat: originLat,
        lng: originLng,
      },
      destination: {
        lat: destinationLat,
        lng: destinationLng,
      },
    });
  } catch (error) {
    console.error(
      "Ola Maps directions request failed:",
      error.response?.status || "",
      error.response?.data ||
        error.message
    );

    return res.status(502).json({
      success: false,
      message:
        error.response?.data?.reason ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Unable to load road navigation",
      coordinates: [],
      instructions: [],
      distanceKm: 0,
      durationMinutes: 0,
    });
  }
});

module.exports = router;