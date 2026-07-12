import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const readBookings = () => {
  try {
    const storedBookings = JSON.parse(
      localStorage.getItem("auraBookings") || "[]"
    );

    return Array.isArray(storedBookings) ? storedBookings : [];
  } catch {
    return [];
  }
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

const getBookingId = (booking, index) => {
  return (
    booking?.id ||
    booking?._id ||
    booking?.bookingId ||
    `AURA-${String(index + 1).padStart(4, "0")}`
  );
};

const getBookingStatus = (booking) => {
  return (
    booking?.status ||
    booking?.bookingStatus ||
    booking?.rideStatus ||
    "Confirmed"
  );
};

const getStatusClass = (booking) => {
  const status = String(getBookingStatus(booking)).toLowerCase();

  if (
    status.includes("cancel") ||
    status.includes("reject") ||
    status.includes("failed")
  ) {
    return "cancelled";
  }

  if (
    status.includes("complete") ||
    status.includes("dropped") ||
    status.includes("paid")
  ) {
    return "completed";
  }

  if (
    status.includes("started") ||
    status.includes("ongoing") ||
    status.includes("accepted") ||
    status.includes("arrived") ||
    status.includes("pickup")
  ) {
    return "active";
  }

  return "confirmed";
};

const formatDate = (booking) => {
  const value =
    booking?.createdAt ||
    booking?.bookingDate ||
    booking?.date ||
    booking?.updatedAt;

  if (!value) {
    return "Recently booked";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadBookings = () => {
    setBookings(readBookings());
  };

  useEffect(() => {
    loadBookings();

    window.addEventListener("storage", loadBookings);
    window.addEventListener("focus", loadBookings);

    return () => {
      window.removeEventListener("storage", loadBookings);
      window.removeEventListener("focus", loadBookings);
    };
  }, []);

  const activeBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const type = getStatusClass(booking);
      return type !== "cancelled" && type !== "completed";
    }).length;
  }, [bookings]);

  const completedBookings = useMemo(() => {
    return bookings.filter(
      (booking) => getStatusClass(booking) === "completed"
    ).length;
  }, [bookings]);

  const openTracking = (booking) => {
    localStorage.setItem("latestBooking", JSON.stringify(booking));
    navigate("/tracking");
  };

  const openPayment = (booking) => {
    localStorage.setItem("latestBooking", JSON.stringify(booking));
    navigate("/payment");
  };

  const confirmCancellation = () => {
    if (!cancelTarget) {
      return;
    }

    const targetId =
      cancelTarget.id ||
      cancelTarget._id ||
      cancelTarget.bookingId;

    const updatedBookings = bookings.map((booking) => {
      const bookingId =
        booking.id ||
        booking._id ||
        booking.bookingId;

      if (String(bookingId) !== String(targetId)) {
        return booking;
      }

      return {
        ...booking,
        status: "Cancelled",
        bookingStatus: "Cancelled",
        driverStatus: "Ride Cancelled",
        driverPhase: "cancelled",
        cancelledAt: new Date().toISOString(),
      };
    });

    localStorage.setItem(
      "auraBookings",
      JSON.stringify(updatedBookings)
    );

    const latestBooking = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("latestBooking") || "null"
        );
      } catch {
        return null;
      }
    })();

    const latestId =
      latestBooking?.id ||
      latestBooking?._id ||
      latestBooking?.bookingId;

    if (String(latestId) === String(targetId)) {
      const cancelledBooking = updatedBookings.find((booking) => {
        const bookingId =
          booking.id ||
          booking._id ||
          booking.bookingId;

        return String(bookingId) === String(targetId);
      });

      localStorage.setItem(
        "latestBooking",
        JSON.stringify(cancelledBooking)
      );
    }

    setBookings(updatedBookings);
    setCancelTarget(null);
  };

  return (
    <main className="premiumBookingsPage">
      <div className="premiumBookingsGlow premiumBookingsGlowOne" />
      <div className="premiumBookingsGlow premiumBookingsGlowTwo" />

      <section className="premiumBookingsContainer">
        <header className="premiumBookingsHeader">
          <div>
            <div className="premiumBookingsLabel">
              <img src={logo} alt="Aura Drive" />
              <span>Aura Drive Journeys</span>
            </div>

            <h1>
              My <span>Bookings</span>
            </h1>

            <p>
              View your ride details, track your driver and manage
              your Aura Drive journeys.
            </p>
          </div>

          <button
            type="button"
            className="premiumNewRideButton"
            onClick={() => navigate("/")}
          >
            <span>+</span>
            Book New Ride
          </button>
        </header>

        <section className="premiumBookingStats">
          <div>
            <span>Total Bookings</span>
            <strong>{bookings.length}</strong>
            <small>All Aura Drive rides</small>
          </div>

          <div>
            <span>Active Rides</span>
            <strong>{activeBookings}</strong>
            <small>Confirmed or ongoing</small>
          </div>

          <div>
            <span>Completed</span>
            <strong>{completedBookings}</strong>
            <small>Successfully finished</small>
          </div>
        </section>

        {bookings.length === 0 ? (
          <section className="premiumBookingsEmpty">
            <div className="premiumEmptyLogo">
              <img src={logo} alt="Aura Drive" />
            </div>

            <span>No journeys yet</span>

            <h2>Your premium ride is waiting</h2>

            <p>
              Book your first Aura Drive journey and all your ride
              details will appear here.
            </p>

            <button type="button" onClick={() => navigate("/")}>
              Book Your First Ride
              <span>→</span>
            </button>
          </section>
        ) : (
          <section className="premiumBookingGrid">
            {bookings.map((booking, index) => {
              const bookingId = getBookingId(booking, index);
              const pickup = getLocationName(
                booking?.pickup ||
                  booking?.pickupLocation ||
                  booking?.from,
                "Pickup location"
              );

              const destination = getLocationName(
                booking?.drop ||
                  booking?.dropLocation ||
                  booking?.destination ||
                  booking?.to,
                "Destination"
              );

              const cabType =
                booking?.cabType ||
                booking?.vehicleType ||
                booking?.carType ||
                booking?.vehicle?.type ||
                "Premium Car";

              const fare =
                booking?.fare ??
                booking?.totalFare ??
                booking?.price ??
                booking?.amount ??
                0;

              const distance =
                booking?.distance ??
                booking?.distanceInKm ??
                booking?.rideDistance ??
                0;

              const paymentStatus =
                booking?.paymentStatus ||
                booking?.payment?.status ||
                "Pending";

              const driverName =
                booking?.assignedDriver?.name ||
                booking?.driver?.name ||
                booking?.driverName ||
                "Driver not assigned";

              const vehicleNumber =
                booking?.assignedDriver?.vehicleNumber ||
                booking?.driver?.vehicleNumber ||
                booking?.vehicleNumber ||
                "Waiting for driver";

              const status = getBookingStatus(booking);
              const statusClass = getStatusClass(booking);
              const canCancel =
                statusClass === "confirmed" ||
                statusClass === "active";

              return (
                <article
                  className="premiumBookingCard"
                  key={String(bookingId)}
                >
                  <div className="premiumBookingCardTop">
                    <div className="premiumBookingIdentity">
                      <span>Booking ID</span>
                      <strong>
                        #
                        {String(bookingId)
                          .slice(-12)
                          .toUpperCase()}
                      </strong>
                    </div>

                    <span
                      className={`premiumBookingStatus ${statusClass}`}
                    >
                      <i />
                      {status}
                    </span>
                  </div>

                  <div className="premiumBookingRoute">
                    <div className="premiumRouteVisual">
                      <span className="premiumPickupDot" />
                      <span className="premiumRouteLine" />
                      <span className="premiumDropDot" />
                    </div>

                    <div className="premiumRouteAddresses">
                      <div>
                        <span>Pickup Location</span>
                        <h3>{pickup}</h3>
                      </div>

                      <div>
                        <span>Destination</span>
                        <h3>{destination}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="premiumBookingDetails">
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
                      <span>Total Fare</span>
                      <strong>
                        {Number(fare) > 0
                          ? `₹${fare}`
                          : "Pending"}
                      </strong>
                    </div>

                    <div>
                      <span>Payment</span>
                      <strong>{paymentStatus}</strong>
                    </div>
                  </div>

                  <div className="premiumDriverInfo">
                    <div className="premiumDriverAvatar">
                      {driverName === "Driver not assigned"
                        ? "?"
                        : driverName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <span>Assigned Driver</span>
                      <strong>{driverName}</strong>
                      <small>{vehicleNumber}</small>
                    </div>
                  </div>

                  <div className="premiumBookingFooter">
                    <span>{formatDate(booking)}</span>

                    <div className="premiumBookingActions">
                      {statusClass === "completed" ? (
                        <button
                          type="button"
                          className="premiumTrackButton"
                          onClick={() => openPayment(booking)}
                        >
                          View Payment
                          <span>→</span>
                        </button>
                      ) : statusClass === "cancelled" ? (
                        <button
                          type="button"
                          className="premiumDisabledButton"
                          disabled
                        >
                          Ride Cancelled
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="premiumTrackButton"
                          onClick={() => openTracking(booking)}
                        >
                          Track Driver
                          <span>→</span>
                        </button>
                      )}

                      {canCancel && (
                        <button
                          type="button"
                          className="premiumCancelButton"
                          onClick={() => setCancelTarget(booking)}
                        >
                          Cancel Ride
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      {cancelTarget && (
        <div className="premiumCancelOverlay">
          <div className="premiumCancelModal">
            <div className="premiumCancelIcon">!</div>

            <span>Cancel Ride</span>

            <h2>Are you sure?</h2>

            <p>
              Your assigned driver will be informed that this ride
              has been cancelled.
            </p>

            <div>
              <button
                type="button"
                className="premiumKeepRideButton"
                onClick={() => setCancelTarget(null)}
              >
                Keep My Ride
              </button>

              <button
                type="button"
                className="premiumConfirmCancelButton"
                onClick={confirmCancellation}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default MyBookings;