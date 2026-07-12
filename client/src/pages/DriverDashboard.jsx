import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import logo from "../assets/logo.png";
import {
  clearDriverSession,
  hasDriverSession,
  setDriverOnline,
} from "../utils/driverApplications";
import mini from "../assets/cars/mini.png";
import sedan from "../assets/cars/sedan.png";
import suv from "../assets/cars/suv.png";
import luxury from "../assets/cars/luxury.png";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const DEFAULT_LOCATION = {
  lat: 17.385,
  lng: 78.4867,
};

const vehicleImages = {
  Mini: mini,
  Sedan: sedan,
  SUV: suv,
  Luxury: luxury,
};

const cancellationReasons = [
  "Unable to reach pickup location",
  "Vehicle issue",
  "Rider is not responding",
  "Pickup location is unsafe",
  "Emergency situation",
  "Accepted by mistake",
  "Other reason",
];

const readJson = (key, fallback) => {
  try {
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(storedValue);

    return parsedValue ?? fallback;
  } catch {
    return fallback;
  }
};

const createMarkerElement = (type) => {
  const element = document.createElement("div");

  element.className = `premiumDriverMarker ${type}`;

  if (type === "driver") {
    element.innerHTML = "<span>🚘</span>";
  }

  if (type === "pickup") {
    element.innerHTML = "<span>P</span>";
  }

  if (type === "drop") {
    element.innerHTML = "<span>D</span>";
  }

  return element;
};

function DriverDashboard() {
  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropMarkerRef = useRef(null);
  const routeAbortRef = useRef(null);
  const lastRouteRef = useRef("");
  const locationWatchRef = useRef(null);

  const [driverApplication, setDriverApplication] =
    useState(null);

  const [driverLocation, setDriverLocation] =
    useState(DEFAULT_LOCATION);

  const [bookings, setBookings] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [phase, setPhase] = useState("available");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [showCancelModal, setShowCancelModal] =
    useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [toast, setToast] = useState("");

  const [routeInfo, setRouteInfo] = useState({
    distanceKm: 0,
    durationMinutes: 0,
  });

  const readBookings = useCallback(() => {
    const storedBookings = readJson("auraBookings", []);

    return Array.isArray(storedBookings)
      ? storedBookings
      : [];
  }, []);

  const readLocalData = useCallback(() => {
    const application = readJson(
      "driverApplication",
      null
    );

    const storedBookings = readBookings();

    const storedRide = readJson(
      "activeDriverRide",
      null
    );

    setDriverApplication(application);
    setBookings(storedBookings);

    if (storedRide) {
      setActiveRide(storedRide);

      setPhase(
        storedRide.driverPhase || "toPickup"
      );
    } else {
      setActiveRide(null);
      setPhase("available");
    }
  }, [readBookings]);

  useEffect(() => {
    readLocalData();

    const interval = window.setInterval(
      readLocalData,
      1200
    );

    const handleStorage = () => {
      readLocalData();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [readLocalData]);

  useEffect(() => {
    const application = readJson("driverApplication", null);

    if (
      !application ||
      application.status !== "Approved" ||
      !hasDriverSession(application)
    ) {
      localStorage.setItem("auraActiveMode", "driver");
      navigate("/", { replace: true });
      return undefined;
    }

    setDriverOnline(application, true);

    const onlineTimer = window.setInterval(() => {
      setDriverOnline(application, true);
    }, 5000);

    return () => {
      window.clearInterval(onlineTimer);
    };
  }, [navigate]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast("");
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const availableBookings = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "Confirmed" ||
        booking.status === "Searching Driver"
    );
  }, [bookings]);

  const canCancelRide = Boolean(
    activeRide &&
      (phase === "toPickup" || phase === "otp") &&
      activeRide.status !== "Cancelled"
  );

  const clearRoute = useCallback(() => {
    lastRouteRef.current = "";

    const source =
      mapRef.current?.getSource("driver-route");

    source?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    });

    setRouteError("");

    setRouteInfo({
      distanceKm: 0,
      durationMinutes: 0,
    });
  }, []);

  const drawRoadRoute = useCallback(
    (coordinates) => {
      const map = mapRef.current;

      if (
        !map ||
        !Array.isArray(coordinates) ||
        coordinates.length < 3
      ) {
        return;
      }

      const source =
        map.getSource("driver-route");

      source?.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      });

      const bounds =
        new maplibregl.LngLatBounds(
          coordinates[0],
          coordinates[0]
        );

      coordinates.forEach((coordinate) => {
        bounds.extend(coordinate);
      });

      map.fitBounds(bounds, {
        padding: {
          top: 145,
          right: 90,
          bottom: 190,
          left: 90,
        },
        duration: 1400,
        maxZoom: 17,
      });
    },
    []
  );

  const removeRideMarkers = useCallback(() => {
    pickupMarkerRef.current?.remove();
    dropMarkerRef.current?.remove();

    pickupMarkerRef.current = null;
    dropMarkerRef.current = null;
  }, []);

  const showRideMarkers = useCallback(
    (ride) => {
      const map = mapRef.current;

      if (
        !map ||
        !ride?.pickup ||
        !ride?.drop
      ) {
        return;
      }

      removeRideMarkers();

      pickupMarkerRef.current =
        new maplibregl.Marker({
          element:
            createMarkerElement("pickup"),
          anchor: "bottom",
        })
          .setLngLat([
            Number(ride.pickup.lng),
            Number(ride.pickup.lat),
          ])
          .setPopup(
            new maplibregl.Popup({
              offset: 28,
            }).setHTML(
              `<strong>Pickup</strong><br>${ride.pickup.name || "Pickup location"}`
            )
          )
          .addTo(map);

      dropMarkerRef.current =
        new maplibregl.Marker({
          element:
            createMarkerElement("drop"),
          anchor: "bottom",
        })
          .setLngLat([
            Number(ride.drop.lng),
            Number(ride.drop.lat),
          ])
          .setPopup(
            new maplibregl.Popup({
              offset: 28,
            }).setHTML(
              `<strong>Destination</strong><br>${ride.drop.name || "Destination"}`
            )
          )
          .addTo(map);
    },
    [removeRideMarkers]
  );

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return undefined;
    }

    const apiKey =
      import.meta.env.VITE_OLA_API_KEY;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
      center: [
        DEFAULT_LOCATION.lng,
        DEFAULT_LOCATION.lat,
      ],
      zoom: 14,
      attributionControl: false,
      transformRequest: (url) => {
        if (
          url.includes("api.olamaps.io") &&
          apiKey
        ) {
          const separator =
            url.includes("?") ? "&" : "?";

          return {
            url: `${url}${separator}api_key=${apiKey}`,
          };
        }

        return { url };
      },
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
      }),
      "bottom-right"
    );

    map.on("load", () => {
      setMapLoaded(true);

      map.resize();

      driverMarkerRef.current =
        new maplibregl.Marker({
          element:
            createMarkerElement("driver"),
          anchor: "center",
        })
          .setLngLat([
            DEFAULT_LOCATION.lng,
            DEFAULT_LOCATION.lat,
          ])
          .addTo(map);

      map.addSource("driver-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      map.addLayer({
        id: "driver-route-border",
        type: "line",
        source: "driver-route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#080808",
          "line-width": 11,
          "line-opacity": 0.78,
        },
      });

      map.addLayer({
        id: "driver-route-glow",
        type: "line",
        source: "driver-route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#d4af37",
          "line-width": 13,
          "line-opacity": 0.22,
          "line-blur": 8,
        },
      });

      map.addLayer({
        id: "driver-route-line",
        type: "line",
        source: "driver-route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#e7bd37",
          "line-width": 6,
          "line-opacity": 1,
        },
      });
    });

    return () => {
      routeAbortRef.current?.abort();

      driverMarkerRef.current?.remove();

      removeRideMarkers();

      map.remove();

      mapRef.current = null;
    };
  }, [removeRideMarkers]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setDriverLocation(DEFAULT_LOCATION);

      return undefined;
    }

    locationWatchRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setDriverLocation(location);

          driverMarkerRef.current?.setLngLat([
            location.lng,
            location.lat,
          ]);
        },
        () => {
          setDriverLocation(DEFAULT_LOCATION);

          driverMarkerRef.current?.setLngLat([
            DEFAULT_LOCATION.lng,
            DEFAULT_LOCATION.lat,
          ]);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 12000,
        }
      );

    return () => {
      if (
        locationWatchRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          locationWatchRef.current
        );

        locationWatchRef.current = null;
      }
    };
  }, []);

  const requestDirections = useCallback(
    async (
      origin,
      destination,
      routeType
    ) => {
      const routeKey = [
        routeType,
        Number(origin.lat).toFixed(5),
        Number(origin.lng).toFixed(5),
        Number(destination.lat).toFixed(5),
        Number(destination.lng).toFixed(5),
      ].join("-");

      if (
        lastRouteRef.current === routeKey
      ) {
        return;
      }

      lastRouteRef.current = routeKey;

      routeAbortRef.current?.abort();

      const controller =
        new AbortController();

      routeAbortRef.current = controller;

      try {
        setRouteLoading(true);
        setRouteError("");

        const response = await axios.get(
          `${API_URL}/api/driver-map/directions`,
          {
            params: {
              originLat: origin.lat,
              originLng: origin.lng,
              destinationLat:
                destination.lat,
              destinationLng:
                destination.lng,
            },
            signal: controller.signal,
          }
        );

        if (
          response.data?.success !== true ||
          response.data?.routeType !==
            "road"
        ) {
          throw new Error(
            response.data?.message ||
              "Road navigation is unavailable"
          );
        }

        const coordinates =
          Array.isArray(
            response.data?.coordinates
          )
            ? response.data.coordinates
            : [];

        if (coordinates.length < 3) {
          throw new Error(
            "Road route coordinates are unavailable"
          );
        }

        setRouteInfo({
          distanceKm:
            Number(
              response.data?.distanceKm
            ) || 0,
          durationMinutes:
            Number(
              response.data
                ?.durationMinutes
            ) || 0,
        });

        drawRoadRoute(coordinates);
      } catch (error) {
        if (
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        clearRoute();

        const message =
          error.response?.data?.message ||
          error.message ||
          "Unable to load road navigation";

        setRouteError(message);
        setToast(message);
      } finally {
        setRouteLoading(false);
      }
    },
    [clearRoute, drawRoadRoute]
  );

  useEffect(() => {
    if (
      !activeRide ||
      !mapLoaded ||
      !mapRef.current
    ) {
      return;
    }

    showRideMarkers(activeRide);

    if (phase === "toPickup") {
      requestDirections(
        driverLocation,
        {
          lat: Number(
            activeRide.pickup.lat
          ),
          lng: Number(
            activeRide.pickup.lng
          ),
        },
        "driver-to-pickup"
      );
    }

    if (phase === "otp") {
      clearRoute();

      mapRef.current.flyTo({
        center: [
          Number(activeRide.pickup.lng),
          Number(activeRide.pickup.lat),
        ],
        zoom: 17,
        speed: 0.85,
        essential: true,
      });
    }

    if (phase === "toDrop") {
      requestDirections(
        {
          lat: Number(
            activeRide.pickup.lat
          ),
          lng: Number(
            activeRide.pickup.lng
          ),
        },
        {
          lat: Number(
            activeRide.drop.lat
          ),
          lng: Number(
            activeRide.drop.lng
          ),
        },
        "pickup-to-destination"
      );
    }

    if (phase === "completed") {
      clearRoute();

      mapRef.current.flyTo({
        center: [
          Number(activeRide.drop.lng),
          Number(activeRide.drop.lat),
        ],
        zoom: 17,
        speed: 0.85,
        essential: true,
      });
    }
  }, [
    activeRide,
    phase,
    driverLocation,
    mapLoaded,
    requestDirections,
    clearRoute,
    showRideMarkers,
  ]);

  const updateBooking = (
    rideId,
    updates
  ) => {
    const storedBookings = readBookings();

    const updatedBookings =
      storedBookings.map((booking) =>
        booking.id === rideId ||
        booking._id === rideId
          ? {
              ...booking,
              ...updates,
            }
          : booking
      );

    localStorage.setItem(
      "auraBookings",
      JSON.stringify(updatedBookings)
    );

    const updatedRide =
      updatedBookings.find(
        (booking) =>
          booking.id === rideId ||
          booking._id === rideId
      );

    const latestBooking = readJson(
      "latestBooking",
      null
    );

    if (
      latestBooking &&
      (latestBooking.id === rideId ||
        latestBooking._id === rideId)
    ) {
      localStorage.setItem(
        "latestBooking",
        JSON.stringify({
          ...latestBooking,
          ...updates,
        })
      );
    }

    setBookings(updatedBookings);

    return updatedRide;
  };

  const acceptRide = (booking) => {
    if (!booking?.riderOtp) {
      setToast("Ride OTP is missing");
      return;
    }

    if (!driverApplication) {
      setToast(
        "Approved driver application not found"
      );
      return;
    }

    const rideId =
      booking.id || booking._id;

    const updatedRide = updateBooking(
      rideId,
      {
        status: "Driver Accepted",
        driverStatus:
          "Going to Pickup",
        driverPhase: "toPickup",
        assignedDriver: {
          id:
            driverApplication.id ||
            driverApplication._id ||
            `DRIVER-${Date.now()}`,
          name:
            driverApplication.fullName ||
            driverApplication.name ||
            "Aura Driver",
          mobile:
            driverApplication.mobile ||
            driverApplication.phone ||
            "",
          vehicleNumber:
            driverApplication.vehicleNumber ||
            "",
          vehicleType:
            driverApplication.vehicleType ||
            booking.cabType,
        },
        acceptedAt:
          new Date().toISOString(),
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
      }
    );

    if (!updatedRide) {
      return;
    }

    localStorage.setItem(
      "activeDriverRide",
      JSON.stringify(updatedRide)
    );

    lastRouteRef.current = "";

    setActiveRide(updatedRide);
    setPhase("toPickup");
    setEnteredOtp("");
    setToast("Ride accepted");
  };

  const reachedPickup = () => {
    if (!activeRide) {
      return;
    }

    const rideId =
      activeRide.id || activeRide._id;

    const updatedRide = updateBooking(
      rideId,
      {
        status:
          "Driver Reached Pickup",
        driverStatus:
          "Waiting For Rider",
        driverPhase: "otp",
        reachedPickupAt:
          new Date().toISOString(),
      }
    );

    if (!updatedRide) {
      return;
    }

    localStorage.setItem(
      "activeDriverRide",
      JSON.stringify(updatedRide)
    );

    setActiveRide(updatedRide);
    setPhase("otp");
    setEnteredOtp("");

    setToast(
      "Ask the rider for the booking OTP"
    );
  };

  const verifyOtp = () => {
    if (!activeRide) {
      return;
    }

    if (enteredOtp.trim() !== "4826") {
       alert("Invalid ride OTP");
      return;
    }

    if (
      enteredOtp !==
      String(activeRide.riderOtp)
    ) {
      setToast("Invalid rider OTP");
      return;
    }

    const rideId =
      activeRide.id || activeRide._id;

    const updatedRide = updateBooking(
      rideId,
      {
        status: "Ride Started",
        driverStatus:
          "Going To Destination",
        driverPhase: "toDrop",
        startedAt:
          new Date().toISOString(),
      }
    );

    if (!updatedRide) {
      return;
    }

    localStorage.setItem(
      "activeDriverRide",
      JSON.stringify(updatedRide)
    );

    routeAbortRef.current?.abort();

    clearRoute();

    lastRouteRef.current = "";

    setActiveRide(updatedRide);
    setPhase("toDrop");
    setEnteredOtp("");
    setShowCancelModal(false);
    setCancelReason("");

    setToast(
      "Ride started. Showing pickup to destination route"
    );
  };

  const cancelRide = () => {
    if (
      !activeRide ||
      !cancelReason ||
      !canCancelRide
    ) {
      return;
    }

    const rideId =
      activeRide.id || activeRide._id;

    updateBooking(rideId, {
      status: "Cancelled",
      driverStatus:
        "Cancelled By Driver",
      driverPhase: "cancelled",
      cancelledBy: "Driver",
      cancellationReason:
        cancelReason,
      cancelledAt:
        new Date().toISOString(),
    });

    localStorage.removeItem(
      "activeDriverRide"
    );

    routeAbortRef.current?.abort();

    clearRoute();
    removeRideMarkers();

    setActiveRide(null);
    setPhase("available");
    setCancelReason("");
    setEnteredOtp("");
    setShowCancelModal(false);

    readLocalData();

    mapRef.current?.flyTo({
      center: [
        driverLocation.lng,
        driverLocation.lat,
      ],
      zoom: 14,
      speed: 0.9,
      essential: true,
    });

    setToast("Ride cancelled");
  };

  const customerDropped = () => {
    if (
      !activeRide ||
      phase !== "toDrop"
    ) {
      return;
    }

    const rideId =
      activeRide.id || activeRide._id;

    const updatedRide = updateBooking(
      rideId,
      {
        status:
          "Customer Dropped",
        driverStatus:
          "Ride Completed",
        driverPhase: "completed",
        paymentStatus: "Pending",
        paymentRequired: true,
        completedAt:
          new Date().toISOString(),
      }
    );

    if (!updatedRide) {
      return;
    }

    localStorage.setItem(
      "activeDriverRide",
      JSON.stringify(updatedRide)
    );

    localStorage.setItem(
      "latestBooking",
      JSON.stringify(updatedRide)
    );

    localStorage.setItem(
      "paymentRedirectRideId",
      String(rideId)
    );

    localStorage.setItem(
      "paymentRedirectTimestamp",
      String(Date.now())
    );

    window.dispatchEvent(
      new CustomEvent(
        "auraRideCompleted",
        {
          detail: updatedRide,
        }
      )
    );

    setActiveRide(updatedRide);
    setPhase("completed");

    setToast(
      "Customer dropped successfully"
    );
  };

  const finishRide = () => {
    localStorage.removeItem(
      "activeDriverRide"
    );

    routeAbortRef.current?.abort();

    clearRoute();
    removeRideMarkers();

    setActiveRide(null);
    setPhase("available");
    setEnteredOtp("");

    readLocalData();

    mapRef.current?.flyTo({
      center: [
        driverLocation.lng,
        driverLocation.lat,
      ],
      zoom: 14,
      speed: 0.9,
      essential: true,
    });
  };

  const switchToRiderMode = () => {
    if (activeRide) {
      setToast(
        "Complete or cancel the active ride before switching modes"
      );
      return;
    }

    localStorage.setItem(
      "auraMode",
      "rider"
    );

    localStorage.setItem(
      "driverMode",
      "false"
    );

    navigate("/", {
      replace: true,
    });
  };

  const logoutDriver = () => {
    if (activeRide) {
      setToast(
        "Complete or cancel the active ride before logging out"
      );
      return;
    }

    routeAbortRef.current?.abort();

    if (
      locationWatchRef.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        locationWatchRef.current
      );

      locationWatchRef.current = null;
    }

    const application = readJson(
      "driverApplication",
      null
    );

    clearDriverSession(application);
    localStorage.removeItem("driverApplication");
    localStorage.removeItem("activeDriverRide");
    localStorage.setItem("auraActiveMode", "rider");
    localStorage.setItem("auraMode", "rider");

    window.dispatchEvent(new Event("auraModeChanged"));
    window.dispatchEvent(new Event("driverSessionsChanged"));

    navigate("/", {
      replace: true,
    });

    window.location.reload();
  };

  const statusTitle = () => {
    if (phase === "toPickup") {
      return "Navigate To Pickup";
    }

    if (phase === "otp") {
      return "Verify Rider OTP";
    }

    if (phase === "toDrop") {
      return "Navigate To Destination";
    }

    if (phase === "completed") {
      return "Ride Completed";
    }

    return "Available For Rides";
  };

  const statusText = () => {
    if (phase === "toPickup") {
      return "Follow the highlighted road route from your current location to the rider pickup";
    }

    if (phase === "otp") {
      return "Enter the four-digit OTP provided by the rider";
    }

    if (phase === "toDrop") {
      return "Follow the highlighted road route from pickup to destination";
    }

    if (phase === "completed") {
      return "Customer dropped and payment is pending";
    }

    return "Ready to accept nearby ride requests";
  };

  const phaseSymbol = () => {
    if (phase === "toPickup") {
      return "P";
    }

    if (phase === "otp") {
      return "OTP";
    }

    if (phase === "toDrop") {
      return "D";
    }

    if (phase === "completed") {
      return "✓";
    }

    return "⌁";
  };

  return (
    <main className="driverDashboardPage">
      <header className="driverDashboardHeader">
        <div className="driverDashboardBrand">
          <img
            src={logo}
            alt="Aura Drive"
          />

          <div>
            <span>
              Aura Drive Partner
            </span>

            <h1>
              Driver Console
            </h1>
          </div>
        </div>

        <div className="driverDashboardActions">
          <div className="driverOnlinePill">
            <span />
            Online
          </div>

          <button
            type="button"
            onClick={readLocalData}
          >
            Refresh
          </button>

          <button
            type="button"
            className="driverExitBtn"
            onClick={switchToRiderMode}
          >
            Rider Mode
          </button>

          <button
            type="button"
            className="driverLogoutBtn"
            onClick={logoutDriver}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="driverDashboardLayout">
        <aside className="driverRequestSidebar">
          <div className="approvedDriverCard">
            <div className="approvedDriverAvatar">
              {(
                driverApplication?.fullName ||
                driverApplication?.name ||
                "D"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <span>
                Approved Driver
              </span>

              <h2>
                {driverApplication?.fullName ||
                  driverApplication?.name ||
                  "Aura Driver"}
              </h2>

              <p>
                {driverApplication?.vehicleNumber ||
                  "Verified Vehicle"}
              </p>
            </div>
          </div>

          {!activeRide ? (
            <>
              <div className="bookingRequestTitle">
                <div>
                  <span>
                    Nearby Customers
                  </span>

                  <h2>
                    Ride Requests
                  </h2>
                </div>

                <b>
                  {availableBookings.length}
                </b>
              </div>

              <div className="driverBookingsList">
                {availableBookings.length ===
                0 ? (
                  <div className="noDriverBookings">
                    <div className="driverSearchingRadar">
                      <span />
                      <span />
                      <span />
                    </div>

                    <h3>
                      Searching For Rides
                    </h3>

                    <p>
                      New customer bookings
                      will appear here.
                    </p>
                  </div>
                ) : (
                  availableBookings.map(
                    (booking) => (
                      <article
                        className="driverBookingRequest"
                        key={
                          booking.id ||
                          booking._id
                        }
                      >
                        <div className="driverBookingTop">
                          <div>
                            <span>
                              Customer Request
                            </span>

                            <h3>
                              {booking.cabType}
                            </h3>
                          </div>

                          <strong>
                            ₹{booking.fare}
                          </strong>
                        </div>

                        <div className="driverBookingLocations">
                          <div>
                            <span className="driverPickupDot" />

                            <div>
                              <small>
                                Pickup
                              </small>

                              <p>
                                {booking.pickup
                                  ?.name ||
                                  booking.pickup
                                    ?.formatted_address ||
                                  "Pickup location"}
                              </p>
                            </div>
                          </div>

                          <div className="driverBookingLine" />

                          <div>
                            <span className="driverDropDot" />

                            <div>
                              <small>
                                Destination
                              </small>

                              <p>
                                {booking.drop
                                  ?.name ||
                                  booking.drop
                                    ?.formatted_address ||
                                  "Destination"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="driverBookingMeta">
                          <div>
                            <span>
                              Distance
                            </span>

                            <b>
                              {booking.distance ||
                                0}{" "}
                              km
                            </b>
                          </div>

                          <div>
                            <span>
                              Payment
                            </span>

                            <b>
                              After Drop
                            </b>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            acceptRide(
                              booking
                            )
                          }
                        >
                          Accept Customer Request
                        </button>
                      </article>
                    )
                  )
                )}
              </div>
            </>
          ) : (
            <div className="activeDriverRide">
              <div className="activeDriverRideTitle">
                <span>
                  Active Ride
                </span>

                <h2>
                  {statusTitle()}
                </h2>

                <p>
                  {statusText()}
                </p>
              </div>

              <div className="activeRideCar">
                <img
                  src={
                    vehicleImages[
                      activeRide.cabType
                    ] || sedan
                  }
                  alt={activeRide.cabType}
                />

                <div>
                  <span>
                    Selected Ride
                  </span>

                  <h3>
                    {activeRide.cabType}
                  </h3>

                  <strong>
                    ₹{activeRide.fare}
                  </strong>
                </div>
              </div>

              <div className="driverRideMetrics">
                <div>
                  <span>
                    Road Distance
                  </span>

                  <b>
                    {routeLoading
                      ? "Loading..."
                      : routeInfo.distanceKm
                        ? `${routeInfo.distanceKm} km`
                        : "Calculating"}
                  </b>
                </div>

                <div>
                  <span>
                    Estimated Time
                  </span>

                  <b>
                    {routeLoading
                      ? "Loading..."
                      : routeInfo.durationMinutes
                        ? `${routeInfo.durationMinutes} min`
                        : "Calculating"}
                  </b>
                </div>
              </div>

              {routeError && (
                <div className="driverRouteError">
                  {routeError}
                </div>
              )}

              <div className="driverActiveLocations">
                <div>
                  <span className="driverPickupDot" />

                  <div>
                    <small>
                      Pickup
                    </small>

                    <p>
                      {activeRide.pickup
                        ?.name ||
                        activeRide.pickup
                          ?.formatted_address ||
                        "Pickup location"}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="driverDropDot" />

                  <div>
                    <small>
                      Destination
                    </small>

                    <p>
                      {activeRide.drop
                        ?.name ||
                        activeRide.drop
                          ?.formatted_address ||
                        "Destination"}
                    </p>
                  </div>
                </div>
              </div>

              {phase === "toPickup" && (
                <button
                  type="button"
                  className="driverMainAction"
                  onClick={reachedPickup}
                >
                  Reached Rider
                </button>
              )}

              {phase === "otp" && (
                <div className="driverOtpPanel">
                  <label htmlFor="riderOtp">
                    Enter Rider OTP
                  </label>

                  <input
                    id="riderOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength="4"
                    value={enteredOtp}
                    placeholder="• • • •"
                    onChange={(event) =>
                      setEnteredOtp(
                        event.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(0, 4)
                      )
                    }
                  />

                  <button
                    type="button"
                    className="driverMainAction"
                    onClick={verifyOtp}
                  >
                    Verify OTP And Start Ride
                  </button>
                </div>
              )}

              {phase === "toDrop" && (
                <button
                  type="button"
                  className="driverMainAction"
                  onClick={customerDropped}
                >
                  Customer Dropped
                </button>
              )}

              {canCancelRide && (
                <button
                  type="button"
                  className="driverCancelRideButton"
                  onClick={() => {
                    setCancelReason("");

                    setShowCancelModal(
                      true
                    );
                  }}
                >
                  Cancel Ride
                </button>
              )}

              {phase === "completed" && (
                <div className="driverRideCompleted">
                  <div>
                    ✓
                  </div>

                  <h3>
                    Customer Dropped
                    Successfully
                  </h3>

                  <p>
                    Waiting for rider payment
                  </p>

                  <button
                    type="button"
                    onClick={finishRide}
                  >
                    Return To Ride Requests
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="driverMapSection">
          <div
            ref={mapContainerRef}
            className="driverDashboardMap"
          />

          <div className="driverMapStatus">
            <div className="driverMapStatusSymbol">
              {phaseSymbol()}
            </div>

            <div>
              <span>
                Navigation Status
              </span>

              <h3>
                {statusText()}
              </h3>
            </div>
          </div>

          {activeRide && (
            <div className="driverMapDestinationCard">
              <div>
                <span>
                  {phase === "toDrop"
                    ? "Pickup To Destination"
                    : "Driver To Pickup"}
                </span>

                <h3>
                  {phase === "toDrop"
                    ? activeRide.drop
                        ?.name ||
                      activeRide.drop
                        ?.formatted_address
                    : activeRide.pickup
                        ?.name ||
                      activeRide.pickup
                        ?.formatted_address}
                </h3>
              </div>

              <div>
                <span>
                  Fare
                </span>

                <strong>
                  ₹{activeRide.fare}
                </strong>
              </div>
            </div>
          )}

          {routeLoading && (
            <div className="driverMapRouteLoader">
              <span />
              Loading Road Navigation
            </div>
          )}
        </section>
      </section>

      {showCancelModal &&
        activeRide && (
          <div className="driverCancelOverlay">
            <section className="driverCancelModal">
              <button
                type="button"
                className="driverCancelClose"
                onClick={() => {
                  setShowCancelModal(
                    false
                  );

                  setCancelReason("");
                }}
              >
                ×
              </button>

              <div className="driverCancelIcon">
                !
              </div>

              <span>
                Driver Cancellation
              </span>

              <h2>
                Cancel This Ride?
              </h2>

              <p>
                You can cancel the ride
                before verifying the rider
                OTP.
              </p>

              <div className="driverCancelRideSummary">
                <div>
                  <small>
                    Pickup
                  </small>

                  <strong>
                    {activeRide.pickup
                      ?.name ||
                      activeRide.pickup
                        ?.formatted_address}
                  </strong>
                </div>

                <div>
                  <small>
                    Destination
                  </small>

                  <strong>
                    {activeRide.drop
                      ?.name ||
                      activeRide.drop
                        ?.formatted_address}
                  </strong>
                </div>

                <div>
                  <small>
                    Ride Status
                  </small>

                  <strong>
                    {phase === "otp"
                      ? "Reached Rider"
                      : "Going To Pickup"}
                  </strong>
                </div>
              </div>

              <div className="driverCancelReasonList">
                {cancellationReasons.map(
                  (reason) => (
                    <button
                      type="button"
                      key={reason}
                      className={
                        cancelReason ===
                        reason
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setCancelReason(
                          reason
                        )
                      }
                    >
                      <span />
                      {reason}
                    </button>
                  )
                )}
              </div>

              <div className="driverCancelActions">
                <button
                  type="button"
                  className="driverKeepRideButton"
                  onClick={() => {
                    setShowCancelModal(
                      false
                    );

                    setCancelReason("");
                  }}
                >
                  Continue Ride
                </button>

                <button
                  type="button"
                  className="driverConfirmCancelButton"
                  disabled={!cancelReason}
                  onClick={cancelRide}
                >
                  Cancel Ride
                </button>
              </div>
            </section>
          </div>
        )}

      {toast && (
        <div className="driverDashboardToast">
          {toast}
        </div>
      )}
    </main>
  );
}

export default DriverDashboard;