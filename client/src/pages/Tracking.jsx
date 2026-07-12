import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import logo from "../assets/logo.png";

const OLA_API_KEY = import.meta.env.VITE_OLA_API_KEY;
const PERMANENT_RIDE_OTP = "4826";

const readLatestBooking = () => {
  try {
    return JSON.parse(localStorage.getItem("latestBooking") || "null");
  } catch {
    return null;
  }
};

const readBookings = () => {
  try {
    const bookings = JSON.parse(
      localStorage.getItem("auraBookings") || "[]"
    );

    return Array.isArray(bookings) ? bookings : [];
  } catch {
    return [];
  }
};

const getBookingId = (booking) => {
  return booking?.id || booking?._id || booking?.bookingId || "";
};

const getLocation = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const lat = Number(
    value.lat ??
      value.latitude ??
      value.geometry?.location?.lat ??
      value.location?.lat
  );

  const lng = Number(
    value.lng ??
      value.lon ??
      value.longitude ??
      value.geometry?.location?.lng ??
      value.location?.lng
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
  };
};

const getLocationName = (location, fallback) => {
  if (!location) {
    return fallback;
  }

  if (typeof location === "string") {
    return location;
  }

  return (
    location.name ||
    location.address ||
    location.formatted_address ||
    location.description ||
    location.label ||
    fallback
  );
};

const createMarkerElement = (className, text) => {
  const marker = document.createElement("div");
  marker.className = className;

  const markerContent = document.createElement("span");
  markerContent.textContent = text;

  marker.appendChild(markerContent);

  return marker;
};

function Tracking() {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropMarkerRef = useRef(null);
  const animationRef = useRef(null);

  const [booking, setBooking] = useState(readLatestBooking());
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [driverPosition, setDriverPosition] = useState(null);

  const pickupLocation = useMemo(() => {
    return getLocation(
      booking?.pickup || booking?.pickupLocation || booking?.from
    );
  }, [booking]);

  const dropLocation = useMemo(() => {
    return getLocation(
      booking?.drop ||
        booking?.dropLocation ||
        booking?.destination ||
        booking?.to
    );
  }, [booking]);

  const storedDriverLocation = useMemo(() => {
    return getLocation(
      booking?.assignedDriver?.location ||
        booking?.driver?.location ||
        booking?.driverLocation || {
          lat:
            booking?.driverLat ||
            booking?.assignedDriver?.lat ||
            booking?.driver?.lat,
          lng:
            booking?.driverLng ||
            booking?.assignedDriver?.lng ||
            booking?.driver?.lng,
        }
    );
  }, [booking]);

  useEffect(() => {
    localStorage.setItem("permanentRideOtp", PERMANENT_RIDE_OTP);

    const updateBooking = () => {
      const latest = readLatestBooking();

      if (!latest) {
        setBooking(null);
        return;
      }

      const bookings = readBookings();
      const latestId = getBookingId(latest);

      const updatedBooking = bookings.find((item) => {
        return String(getBookingId(item)) === String(latestId);
      });

      const finalBooking = {
        ...(updatedBooking || latest),
        riderOtp: PERMANENT_RIDE_OTP,
        rideOtp: PERMANENT_RIDE_OTP,
        otp: PERMANENT_RIDE_OTP,
      };

      localStorage.setItem("latestBooking", JSON.stringify(finalBooking));
      setBooking(finalBooking);
    };

    updateBooking();

    const interval = window.setInterval(updateBooking, 2000);

    window.addEventListener("storage", updateBooking);
    window.addEventListener("focus", updateBooking);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", updateBooking);
      window.removeEventListener("focus", updateBooking);
    };
  }, []);

  useEffect(() => {
    if (!pickupLocation) {
      setDriverPosition(null);
      return;
    }

    if (storedDriverLocation) {
      setDriverPosition(storedDriverLocation);
      return;
    }

    setDriverPosition({
      lat: pickupLocation.lat + 0.008,
      lng: pickupLocation.lng - 0.008,
    });
  }, [pickupLocation, storedDriverLocation]);

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      !pickupLocation ||
      mapRef.current
    ) {
      return;
    }

    try {
      const styleUrl = OLA_API_KEY
        ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${OLA_API_KEY}`
        : "https://demotiles.maplibre.org/style.json";

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [pickupLocation.lng, pickupLocation.lat],
        zoom: 13,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
        }),
        "bottom-right"
      );

      map.on("load", () => {
        setMapReady(true);
        setMapError("");

        pickupMarkerRef.current = new maplibregl.Marker({
          element: createMarkerElement("trackingPickupMarker", "P"),
          anchor: "bottom",
        })
          .setLngLat([pickupLocation.lng, pickupLocation.lat])
          .addTo(map);

        if (dropLocation) {
          dropMarkerRef.current = new maplibregl.Marker({
            element: createMarkerElement("trackingDropMarker", "D"),
            anchor: "bottom",
          })
            .setLngLat([dropLocation.lng, dropLocation.lat])
            .addTo(map);
        }

        if (driverPosition) {
          driverMarkerRef.current = new maplibregl.Marker({
            element: createMarkerElement("trackingDriverMarker", "🚘"),
            anchor: "center",
          })
            .setLngLat([driverPosition.lng, driverPosition.lat])
            .addTo(map);
        }

        const coordinates = [
          [pickupLocation.lng, pickupLocation.lat],
        ];

        if (dropLocation) {
          coordinates.push([dropLocation.lng, dropLocation.lat]);
        }

        if (driverPosition) {
          coordinates.push([driverPosition.lng, driverPosition.lat]);
        }

        if (coordinates.length > 1) {
          const bounds = new maplibregl.LngLatBounds(
            coordinates[0],
            coordinates[0]
          );

          coordinates.forEach((coordinate) => {
            bounds.extend(coordinate);
          });

          map.fitBounds(bounds, {
            padding: {
              top: 150,
              right: 80,
              bottom: 300,
              left: 80,
            },
            maxZoom: 15,
            duration: 1200,
          });
        }
      });

      map.on("error", () => {
        setMapError(
          "Unable to load the map. Check your Ola Maps API key."
        );
      });
    } catch {
      setMapError("Unable to load the driver tracking map.");
    }

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      pickupMarkerRef.current = null;
      dropMarkerRef.current = null;
      driverMarkerRef.current = null;
    };
  }, [pickupLocation, dropLocation]);

  useEffect(() => {
    if (!mapReady || !driverPosition || !mapRef.current) {
      return;
    }

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new maplibregl.Marker({
        element: createMarkerElement("trackingDriverMarker", "🚘"),
        anchor: "center",
      })
        .setLngLat([driverPosition.lng, driverPosition.lat])
        .addTo(mapRef.current);

      return;
    }

    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
    }

    const marker = driverMarkerRef.current;
    const start = marker.getLngLat();
    const target = driverPosition;
    const startTime = performance.now();
    const duration = 1200;

    const animateMarker = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const lng = start.lng + (target.lng - start.lng) * eased;
      const lat = start.lat + (target.lat - start.lat) * eased;

      marker.setLngLat([lng, lat]);

      if (progress < 1) {
        animationRef.current =
          window.requestAnimationFrame(animateMarker);
      }
    };

    animationRef.current =
      window.requestAnimationFrame(animateMarker);
  }, [driverPosition, mapReady]);

  useEffect(() => {
    const status = String(
      booking?.driverStatus || booking?.status || ""
    ).toLowerCase();

    if (
      storedDriverLocation ||
      !pickupLocation ||
      status.includes("cancel") ||
      status.includes("complete") ||
      status.includes("dropped")
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setDriverPosition((current) => {
        if (!current) {
          return current;
        }

        const latDifference = pickupLocation.lat - current.lat;
        const lngDifference = pickupLocation.lng - current.lng;

        const remainingDistance = Math.sqrt(
          latDifference * latDifference +
            lngDifference * lngDifference
        );

        if (remainingDistance < 0.00025) {
          return {
            lat: pickupLocation.lat,
            lng: pickupLocation.lng,
          };
        }

        return {
          lat: current.lat + latDifference * 0.08,
          lng: current.lng + lngDifference * 0.08,
        };
      });
    }, 2200);

    return () => {
      window.clearInterval(interval);
    };
  }, [pickupLocation, storedDriverLocation, booking]);

  if (!booking) {
    return (
      <main className="trackingEmptyPage">
        <div>
          <img src={logo} alt="Aura Drive" />
          <h1>No active booking</h1>
          <p>
            Select a booking from My Bookings to track your driver.
          </p>

          <button
            type="button"
            onClick={() => navigate("/my-bookings")}
          >
            View My Bookings
          </button>
        </div>
      </main>
    );
  }

  const pickupName = getLocationName(
    booking?.pickup || booking?.pickupLocation || booking?.from,
    "Pickup location"
  );

  const destinationName = getLocationName(
    booking?.drop ||
      booking?.dropLocation ||
      booking?.destination ||
      booking?.to,
    "Destination"
  );

  const driverName =
    booking?.assignedDriver?.name ||
    booking?.driver?.name ||
    booking?.driverName ||
    "Finding your driver";

  const driverPhone =
    booking?.assignedDriver?.phone ||
    booking?.driver?.phone ||
    booking?.driverPhone ||
    "";

  const vehicleNumber =
    booking?.assignedDriver?.vehicleNumber ||
    booking?.driver?.vehicleNumber ||
    booking?.vehicleNumber ||
    "Vehicle details pending";

  const cabType =
    booking?.cabType ||
    booking?.vehicleType ||
    booking?.carType ||
    booking?.vehicle?.type ||
    "Car";

  const distance =
    booking?.distance ??
    booking?.distanceInKm ??
    booking?.rideDistance ??
    0;

  const fare =
    booking?.fare ??
    booking?.totalFare ??
    booking?.amount ??
    booking?.price ??
    0;

  const status =
    booking?.driverStatus ||
    booking?.status ||
    "Waiting for Driver";

  const normalizedStatus = String(status).toLowerCase();

  const cancelled =
    normalizedStatus.includes("cancel") ||
    normalizedStatus.includes("reject");

  const completed =
    normalizedStatus.includes("complete") ||
    normalizedStatus.includes("dropped");

  return (
    <main className="premiumTrackingPage">
      <div
        ref={mapContainerRef}
        className="premiumTrackingMap"
      />

      {!mapReady && !mapError && (
        <div className="trackingMapLoader">
          <div />
          <span>Loading driver location</span>
        </div>
      )}

      {mapError && (
        <div className="trackingMapError">{mapError}</div>
      )}

      <button
        type="button"
        className="trackingBackButton"
        onClick={() => navigate("/my-bookings")}
      >
        ←
      </button>

      <section className="trackingTopCard">
        <div className="trackingBrand">
          <img src={logo} alt="Aura Drive" />

          <div className="trackingBrandText">
            <span>Live Ride Tracking</span>
            <h2>{status}</h2>
          </div>
        </div>

        <div
          className={`trackingLiveStatus ${
            cancelled
              ? "cancelled"
              : completed
              ? "completed"
              : ""
          }`}
        >
          <i />

          {cancelled
            ? "Cancelled"
            : completed
            ? "Completed"
            : "Live"}
        </div>
      </section>

      <section className="trackingBottomPanel">
        <div className="trackingMainRow">
          <div className="trackingDriverCard">
            <div className="trackingDriverAvatar">
              {driverName === "Finding your driver"
                ? "?"
                : driverName.charAt(0).toUpperCase()}
            </div>

            <div className="trackingDriverDetails">
              <span>Your Driver</span>
              <h3>{driverName}</h3>
              <p>{vehicleNumber}</p>
            </div>

            {driverPhone && (
              <a
                className="trackingCallButton"
                href={`tel:${driverPhone}`}
              >
                Call
              </a>
            )}
          </div>

          <div className="trackingRouteCard">
            <div className="trackingRouteDots">
              <span />
              <i />
              <b />
            </div>

            <div className="trackingRouteText">
              <div>
                <span>Pickup</span>
                <strong title={pickupName}>{pickupName}</strong>
              </div>

              <div>
                <span>Destination</span>
                <strong title={destinationName}>
                  {destinationName}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="trackingRideInfo">
          <div>
            <span>Vehicle</span>
            <strong>{cabType}</strong>
          </div>

          <div>
            <span>Distance</span>
            <strong>
              {Number(distance) > 0
                ? `${distance} km`
                : "Pending"}
            </strong>
          </div>

          <div>
            <span>Fare</span>
            <strong>
              {Number(fare) > 0 ? `₹${fare}` : "Pending"}
            </strong>
          </div>

          <div>
            <span>Ride OTP</span>
            <strong>{PERMANENT_RIDE_OTP}</strong>
          </div>
        </div>

        {completed && (
          <button
            type="button"
            className="trackingPaymentButton"
            onClick={() => navigate("/payment")}
          >
            Continue to Payment
            <span>→</span>
          </button>
        )}
      </section>
    </main>
  );
}

export default Tracking;