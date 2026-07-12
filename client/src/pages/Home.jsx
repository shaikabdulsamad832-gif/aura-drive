import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LocationPicker from "../components/LocationPicker";
import DriverSearchModal from "../components/DriverSearchModal";
import VehicleSlider from "../components/VehicleSlider";
import DriverOnboarding from "../components/DriverOnboarding";

import { generateUniqueRideOtp } from "../utils/rideOtp";
import {
  createDriverSession,
  hasDriverSession,
} from "../utils/driverApplications";

import logo from "../assets/logo.png";
import heroCar from "../assets/hero-car.png";

function Home() {
  const navigate = useNavigate();

  const [mode, setMode] = useState(
    localStorage.getItem("auraActiveMode") ||
      "rider"
  );

  const [
    showDriverOnboarding,
    setShowDriverOnboarding,
  ] = useState(false);

  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [mapMode, setMapMode] = useState(null);

  const [cabType, setCabType] =
    useState("Sedan");

  const [showVehicles, setShowVehicles] =
    useState(false);

  const [
    showDriverModal,
    setShowDriverModal,
  ] = useState(false);

  const [
    currentBooking,
    setCurrentBooking,
  ] = useState(null);

  const rates = {
    Mini: 15,
    Sedan: 20,
    SUV: 28,
    Luxury: 45,
  };

  useEffect(() => {
    localStorage.setItem(
      "auraActiveMode",
      mode
    );

    window.dispatchEvent(
      new Event("auraModeChanged")
    );
  }, [mode]);

  useEffect(() => {
    return () => {
      const pathname = window.location.pathname;

      if (
        pathname !== "/" &&
        pathname !== "/home" &&
        pathname !== "/driver"
      ) {
        localStorage.setItem(
          "auraActiveMode",
          "rider"
        );

        window.dispatchEvent(
          new Event("auraModeChanged")
        );
      }
    };
  }, []);

  const getDriverApplication = () => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "driverApplication"
        ) || "null"
      );
    } catch {
      return null;
    }
  };

  const getStoredBookings = () => {
    try {
      const bookings = JSON.parse(
        localStorage.getItem(
          "auraBookings"
        ) || "[]"
      );

      return Array.isArray(bookings)
        ? bookings
        : [];
    } catch {
      return [];
    }
  };

  const calculateDistance = () => {
    if (!pickup || !drop) {
      return 0;
    }

    const pickupLat = Number(pickup.lat);
    const pickupLng = Number(pickup.lng);
    const dropLat = Number(drop.lat);
    const dropLng = Number(drop.lng);

    if (
      !Number.isFinite(pickupLat) ||
      !Number.isFinite(pickupLng) ||
      !Number.isFinite(dropLat) ||
      !Number.isFinite(dropLng)
    ) {
      return 0;
    }

    const earthRadius = 6371;

    const latitudeDifference =
      ((dropLat - pickupLat) * Math.PI) /
      180;

    const longitudeDifference =
      ((dropLng - pickupLng) * Math.PI) /
      180;

    const value =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(
        (pickupLat * Math.PI) / 180
      ) *
        Math.cos(
          (dropLat * Math.PI) / 180
        ) *
        Math.sin(
          longitudeDifference / 2
        ) **
          2;

    const result =
      earthRadius *
      2 *
      Math.atan2(
        Math.sqrt(value),
        Math.sqrt(1 - value)
      );

    return Number(result.toFixed(2));
  };

  const distance = calculateDistance();

  const fare = Math.round(
    distance * rates[cabType]
  );

  const switchToRider = () => {
    localStorage.setItem(
      "auraActiveMode",
      "rider"
    );

    setMode("rider");
    setMapMode(null);
    setShowVehicles(false);
    setShowDriverModal(false);

    window.dispatchEvent(
      new Event("auraModeChanged")
    );
  };

  const switchToDriver = () => {
    const application = getDriverApplication();

    localStorage.setItem("auraActiveMode", "driver");

    setMode("driver");
    setMapMode(null);
    setShowVehicles(false);
    setShowDriverModal(false);

    window.dispatchEvent(new Event("auraModeChanged"));

    if (application?.status === "Approved") {
      if (!hasDriverSession(application)) {
        createDriverSession(application);
      }

      navigate("/driver");
      return;
    }
  };

  const chooseVehicle = () => {
    if (!pickup) {
      alert(
        "Please select pickup location"
      );
      return;
    }

    if (!drop) {
      alert(
        "Please select destination"
      );
      return;
    }

    if (distance <= 0) {
      alert(
        "Unable to calculate ride distance"
      );
      return;
    }

    setShowVehicles(true);
  };

  const createBooking = () => {
    if (!pickup || !drop) {
      alert(
        "Please select pickup and destination"
      );
      return;
    }

    if (!distance || distance <= 0) {
      alert(
        "Unable to calculate the ride distance"
      );
      return;
    }

    const permanentOtp =
      generateUniqueRideOtp();

    const booking = {
      id: `RIDE-${Date.now()}-${Math.floor(
        Math.random() * 100000
      )}`,
      pickup,
      drop,
      cabType,
      distance,
      fare,
      riderOtp: permanentOtp,
      rideOtp: permanentOtp,
      otp: permanentOtp,
      paymentStatus: "Pending",
      status: "Confirmed",
      driverStatus:
        "Waiting for Driver",
      driverPhase: "waiting",
      assignedDriver: null,
      acceptedAt: null,
      reachedPickupAt: null,
      startedAt: null,
      completedAt: null,
      createdAt:
        new Date().toISOString(),
      date: new Date().toLocaleString(),
    };

    const previousBookings =
      getStoredBookings();

    const updatedBookings = [
      booking,
      ...previousBookings,
    ];

    localStorage.setItem(
      "auraBookings",
      JSON.stringify(updatedBookings)
    );

    localStorage.setItem(
      "latestBooking",
      JSON.stringify(booking)
    );

    setCurrentBooking(booking);
    setShowVehicles(false);
    setShowDriverModal(true);
  };

  const driverApplication =
    getDriverApplication();

  return (
    <main className="home dualModeHome">
      <section className="modePageShell">
        <div className="homeModeSwitch">
          <button
            type="button"
            className={
              mode === "rider"
                ? "active"
                : ""
            }
            onClick={switchToRider}
          >
            Rider
          </button>

          <button
            type="button"
            className={
              mode === "driver"
                ? "active"
                : ""
            }
            onClick={switchToDriver}
          >
            Driver
          </button>

          <span
            className={`homeModeSlider ${
              mode === "driver"
                ? "showDriver"
                : ""
            }`}
          />
        </div>

        {mode === "rider" && (
          <div className="modeContent riderModeContent">
            <div className="riderWelcomePanel">
              <div className="riderBrandChip">
                <img
                  src={logo}
                  alt="Aura Drive"
                />

                <span>Premium Rider</span>
              </div>

              <h1>
                Your Ride.
                <br />
                <span>Your Aura.</span>
              </h1>

              <p>
                Select pickup and destination
                using the full-screen map.
                Vehicle options appear after
                destination confirmation.
              </p>

              <button
                type="button"
                className="riderStartBtn"
                onClick={() =>
                  setMapMode("pickup")
                }
              >
                Start Booking
                <span>→</span>
              </button>

              <div className="riderHeroCar">
                <div className="riderCarGlow" />

                <img
                  src={heroCar}
                  alt="Aura Drive premium car"
                />
              </div>
            </div>

            <div className="cleanBookingCard riderBookingCard">
              <div className="cleanCardHeader">
                <div>
                  <p>Aura Drive</p>
                  <h2>Book Your Ride</h2>
                </div>

                <img
                  src={logo}
                  alt="Aura Drive"
                />
              </div>

              <button
                type="button"
                className="cleanLocation"
                onClick={() =>
                  setMapMode("pickup")
                }
              >
                <span className="pickupCircle" />

                <div>
                  <small>
                    Pickup Location
                  </small>

                  <h4>
                    {pickup
                      ? pickup.name
                      : "Choose pickup location"}
                  </h4>
                </div>
              </button>

              <div className="cleanRouteLine" />

              <button
                type="button"
                className="cleanLocation"
                onClick={() =>
                  setMapMode("drop")
                }
              >
                <span className="dropCircle" />

                <div>
                  <small>Destination</small>

                  <h4>
                    {drop
                      ? drop.name
                      : "Choose destination"}
                  </h4>
                </div>
              </button>

              <div className="cleanFareBox">
                <div>
                  <span>Pickup</span>
                  <b>
                    {pickup
                      ? "Selected"
                      : "Pending"}
                  </b>
                </div>

                <div>
                  <span>Drop</span>
                  <b>
                    {drop
                      ? "Selected"
                      : "Pending"}
                  </b>
                </div>

                <div>
                  <span>Distance</span>
                  <b>{distance} km</b>
                </div>
              </div>

              <button
                type="button"
                className="cleanBookBtn"
                onClick={chooseVehicle}
              >
                Choose Vehicle
              </button>
            </div>
          </div>
        )}

        {mode === "driver" && (
          <div className="modeContent driverModeContent">
            <div className="driverModeCard">
              <div className="driverModeLogo">
                <img
                  src={logo}
                  alt="Aura Drive Driver"
                />
              </div>

              {driverApplication?.status ===
                "Pending" && (
                <div className="driverApplicationStatus">
                  <div className="statusIcon">
                    ⌛
                  </div>

                  <div>
                    <span>
                      Driver Application
                    </span>

                    <h2>
                      Pending Verification
                    </h2>

                    <p>
                      Your documents are waiting
                      for admin approval.
                    </p>
                  </div>
                </div>
              )}

              {driverApplication?.status ===
                "Rejected" && (
                <div className="driverApplicationStatus rejected">
                  <div className="statusIcon">
                    ×
                  </div>

                  <div>
                    <span>
                      Driver Application
                    </span>

                    <h2>
                      Application Rejected
                    </h2>

                    <p>
                      Submit a new application
                      with correct documents.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(
                        "driverApplication"
                      );

                      setShowDriverOnboarding(
                        true
                      );
                    }}
                  >
                    Apply Again
                  </button>
                </div>
              )}

              {!driverApplication && (
                <button
                  type="button"
                  className="premiumBecomeDriver"
                  onClick={() =>
                    setShowDriverOnboarding(
                      true
                    )
                  }
                >
                  <span className="becomeDriverLogo">
                    <img
                      src={logo}
                      alt="Aura Drive"
                    />
                  </span>

                  <span className="becomeDriverText">
                    Become Aura Driver
                  </span>

                  <span className="becomeDriverArrow">
                    →
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {mode === "rider" && mapMode && (
        <LocationPicker
          mode={mapMode}
          pickup={pickup}
          drop={drop}
          onClose={() =>
            setMapMode(null)
          }
          onConfirm={(location) => {
            if (mapMode === "pickup") {
              setPickup(location);
            } else {
              setDrop(location);

              if (pickup) {
                setShowVehicles(true);
              }
            }

            setMapMode(null);
          }}
        />
      )}

      {mode === "rider" &&
        showVehicles && (
          <div className="vehicleOverlay">
            <div className="vehicleModal">
              <div className="vehicleModalHeader">
                <div>
                  <p>Aura Drive Fleet</p>
                  <h2>
                    Select Your Vehicle
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowVehicles(false)
                  }
                  aria-label="Close vehicle selection"
                >
                  ×
                </button>
              </div>

              <div className="vehicleRouteSummary">
                <div>
                  <span>Distance</span>
                  <b>{distance} km</b>
                </div>

                <div>
                  <span>
                    Selected Ride
                  </span>
                  <b>{cabType}</b>
                </div>

                <div>
                  <span>Fare</span>
                  <b>₹{fare}</b>
                </div>
              </div>

              <VehicleSlider
                cabType={cabType}
                setCabType={setCabType}
                distance={distance}
              />

              <button
                type="button"
                className="confirmVehicleBtn"
                onClick={createBooking}
              >
                Confirm {cabType} Ride
              </button>
            </div>
          </div>
        )}

      {mode === "rider" &&
        showDriverModal &&
        currentBooking && (
          <DriverSearchModal
            booking={currentBooking}
            onClose={() =>
              setShowDriverModal(false)
            }
            onTrack={() => {
              setShowDriverModal(false);
              navigate("/tracking");
            }}
          />
        )}

      {showDriverOnboarding && (
        <DriverOnboarding
          onClose={() => {
            setShowDriverOnboarding(false);
            setMode("driver");

            localStorage.setItem(
              "auraActiveMode",
              "driver"
            );

            window.dispatchEvent(
              new Event("auraModeChanged")
            );
          }}
        />
      )}
    </main>
  );
}

export default Home;