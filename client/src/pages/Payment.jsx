import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo.png";
import "./Payment.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

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

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      const complete = () => resolve(Boolean(window.Razorpay));

      existingScript.addEventListener("load", complete, {
        once: true,
      });

      existingScript.addEventListener(
        "error",
        () => resolve(false),
        {
          once: true,
        }
      );

      window.setTimeout(complete, 3000);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

const getCheckoutDisplay = (method) => {
  if (method === "upi") {
    return {
      sequence: ["upi", "card"],
      preferences: {
        show_default_blocks: true,
      },
    };
  }

  return {
    sequence: ["card", "upi"],
    preferences: {
      show_default_blocks: true,
    },
  };
};

function Payment() {
  const navigate = useNavigate();

  const [booking, setBooking] = useState(() =>
    readJson("latestBooking", null)
  );

  const [selectedMethod, setSelectedMethod] =
    useState("upi");

  const [processing, setProcessing] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const currentUser = useMemo(
    () =>
      readJson("currentUser", null) ||
      readJson("auraUser", null) ||
      readJson("user", null) ||
      {},
    []
  );

  useEffect(() => {
    setBooking(readJson("latestBooking", null));
  }, []);

  const paymentAllowed = Boolean(
    booking &&
      (booking.status === "Customer Dropped" ||
        booking.driverPhase === "completed" ||
        booking.paymentRequired === true ||
        booking.status === "Completed") &&
      booking.paymentStatus !== "Paid"
  );

  const saveSuccessfulPayment = (payment) => {
    const savedBookings = readJson(
      "auraBookings",
      []
    );

    const updatedBooking = {
      ...booking,
      status: "Completed",
      driverStatus: "Payment Completed",
      driverPhase: "completed",
      paymentStatus: "Paid",
      paymentRequired: false,
      paymentId: payment.paymentId,
      razorpayOrderId: payment.orderId,
      paymentMethod: payment.method,
      paymentAmount: payment.amount,
      paidAt:
        payment.paidAt ||
        new Date().toISOString(),
    };

    const existingBookings = Array.isArray(
      savedBookings
    )
      ? savedBookings
      : [];

    const bookingExists = existingBookings.some(
      (ride) =>
        ride.id === booking.id ||
        ride._id === booking._id
    );

    const updatedBookings = bookingExists
      ? existingBookings.map((ride) =>
          ride.id === booking.id ||
          ride._id === booking._id
            ? updatedBooking
            : ride
        )
      : [updatedBooking, ...existingBookings];

    localStorage.setItem(
      "auraBookings",
      JSON.stringify(updatedBookings)
    );

    localStorage.setItem(
      "latestBooking",
      JSON.stringify(updatedBooking)
    );

    const activeDriverRide = readJson(
      "activeDriverRide",
      null
    );

    if (
      activeDriverRide &&
      (activeDriverRide.id === booking.id ||
        activeDriverRide._id === booking._id)
    ) {
      localStorage.setItem(
        "activeDriverRide",
        JSON.stringify({
          ...activeDriverRide,
          status: "Completed",
          driverStatus: "Payment Completed",
          driverPhase: "completed",
          paymentStatus: "Paid",
          paymentRequired: false,
          paymentId: payment.paymentId,
          razorpayOrderId: payment.orderId,
          paymentMethod: payment.method,
          paymentAmount: payment.amount,
          paidAt:
            payment.paidAt ||
            new Date().toISOString(),
        })
      );
    }

    localStorage.removeItem(
      "paymentRedirectRideId"
    );

    localStorage.removeItem(
      "paymentRedirectTimestamp"
    );

    setBooking(updatedBooking);

    navigate("/payment-success", {
      replace: true,
      state: {
        booking: updatedBooking,
      },
    });
  };

  const verifyPayment = async (
    razorpayResponse
  ) => {
    const response = await axios.post(
      `${API_URL}/api/payments/verify`,
      {
        rideId:
          booking.id ||
          booking._id ||
          `AURA-${Date.now()}`,
        razorpay_order_id:
          razorpayResponse.razorpay_order_id,
        razorpay_payment_id:
          razorpayResponse.razorpay_payment_id,
        razorpay_signature:
          razorpayResponse.razorpay_signature,
      }
    );

    if (response.data?.success !== true) {
      throw new Error(
        response.data?.message ||
          "Payment verification failed"
      );
    }

    saveSuccessfulPayment(
      response.data.payment
    );
  };

  const startPayment = async () => {
    if (!booking) {
      setErrorMessage(
        "No booking was found for payment"
      );
      return;
    }

    if (booking.paymentStatus === "Paid") {
      navigate("/payment-success", {
        state: {
          booking,
        },
      });
      return;
    }

    if (!paymentAllowed) {
      setErrorMessage(
        "Payment becomes available after the customer is dropped"
      );
      return;
    }

    try {
      setProcessing(true);
      setErrorMessage("");
      setStatusMessage(
        "Preparing secure checkout..."
      );

      const razorpayLoaded =
        await loadRazorpayScript();

      if (
        !razorpayLoaded ||
        !window.Razorpay
      ) {
        throw new Error(
          "Razorpay Checkout could not be loaded"
        );
      }

      const rideId =
        booking.id ||
        booking._id ||
        `AURA-${Date.now()}`;

      const orderResponse = await axios.post(
        `${API_URL}/api/payments/create-order`,
        {
          rideId,
          amount: Number(booking.fare),
          cabType: booking.cabType,
        }
      );

      if (
        orderResponse.data?.success !== true
      ) {
        throw new Error(
          orderResponse.data?.message ||
            "Unable to create payment order"
        );
      }

      const checkoutOptions = {
        key: orderResponse.data.keyId,
        amount: orderResponse.data.amount,
        currency:
          orderResponse.data.currency ||
          "INR",
        order_id:
          orderResponse.data.orderId,
        name: "Aura Drive",
        description: `${booking.cabType || "Aura"} ride payment`,
        image: logo,
        config: {
          display:
            getCheckoutDisplay(
              selectedMethod
            ),
        },
        prefill: {
          name:
            currentUser.fullName ||
            currentUser.name ||
            booking.riderName ||
            booking.name ||
            "",
          email:
            currentUser.email ||
            booking.email ||
            "",
          contact:
            currentUser.mobile ||
            currentUser.phone ||
            booking.mobile ||
            booking.phone ||
            "",
        },
        notes: {
          rideId: String(rideId),
          cabType: String(
            booking.cabType || ""
          ),
          pickup: String(
            booking.pickup?.name ||
              booking.pickup
                ?.formatted_address ||
              ""
          ).slice(0, 200),
          destination: String(
            booking.drop?.name ||
              booking.drop
                ?.formatted_address ||
              ""
          ).slice(0, 200),
        },
        theme: {
          color: "#d4af37",
          backdrop_color:
            "rgba(0, 0, 0, 0.88)",
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        modal: {
          escape: true,
          confirm_close: true,
          ondismiss: () => {
            setProcessing(false);
            setStatusMessage("");
          },
        },
        handler: async (
          razorpayResponse
        ) => {
          try {
            setProcessing(true);
            setErrorMessage("");
            setStatusMessage(
              "Verifying payment..."
            );

            await verifyPayment(
              razorpayResponse
            );
          } catch (error) {
            setProcessing(false);
            setStatusMessage("");

            setErrorMessage(
              error.response?.data
                ?.message ||
                error.message ||
                "Payment verification failed"
            );
          }
        },
      };

      const checkout =
        new window.Razorpay(
          checkoutOptions
        );

      checkout.on(
        "payment.failed",
        (response) => {
          setProcessing(false);
          setStatusMessage("");

          setErrorMessage(
            response.error?.description ||
              response.error?.reason ||
              "Payment failed. Please try again."
          );
        }
      );

      checkout.open();

      setProcessing(false);
      setStatusMessage("");
    } catch (error) {
      setProcessing(false);
      setStatusMessage("");

      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to open Razorpay Checkout"
      );
    }
  };

  if (!booking) {
    return (
      <main className="paymentPage">
        <section className="paymentCard paymentEmptyCard">
          <img
            src={logo}
            alt="Aura Drive"
            className="paymentLogo"
          />

          <h1>No payment available</h1>

          <p>
            Complete a ride before opening
            the payment page.
          </p>

          <button
            type="button"
            className="payNowButton"
            onClick={() => navigate("/")}
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="paymentPage">
      <section className="paymentCard">
        <div className="paymentTitleArea">
          <img
            src={logo}
            alt="Aura Drive"
            className="paymentLogo"
          />

          <div>
            <span>Aura Drive</span>
            <h1>Complete Payment</h1>
          </div>
        </div>

        <div className="paymentRideInfo">
          <div>
            <span>Ride</span>

            <strong>
              {booking.cabType ||
                "Aura Ride"}
            </strong>
          </div>

          <div>
            <span>Distance</span>

            <strong>
              {booking.distance || 0} km
            </strong>
          </div>

          <div>
            <span>Status</span>

            <strong>
              {booking.paymentStatus ||
                "Pending"}
            </strong>
          </div>
        </div>

        <div className="paymentLocations">
          <div>
            <span className="paymentPickupPoint" />

            <section>
              <small>Pickup</small>

              <p>
                {booking.pickup?.name ||
                  booking.pickup
                    ?.formatted_address ||
                  "Pickup location"}
              </p>
            </section>
          </div>

          <div>
            <span className="paymentDropPoint" />

            <section>
              <small>Destination</small>

              <p>
                {booking.drop?.name ||
                  booking.drop
                    ?.formatted_address ||
                  "Destination"}
              </p>
            </section>
          </div>
        </div>

        <div className="paymentMethods">
          <h2>
            Select Payment Method
          </h2>

          <button
            type="button"
            className={`paymentMethod ${
              selectedMethod === "upi"
                ? "selected"
                : ""
            }`}
            onClick={() => {
              setSelectedMethod("upi");
              setErrorMessage("");
            }}
            disabled={processing}
          >
            <span className="paymentRadio" />

            <div>
              <strong>UPI</strong>

              <p>
                Pay through a UPI app or
                scan the Razorpay QR code
              </p>
            </div>
          </button>

          <button
            type="button"
            className={`paymentMethod ${
              selectedMethod === "card"
                ? "selected"
                : ""
            }`}
            onClick={() => {
              setSelectedMethod("card");
              setErrorMessage("");
            }}
            disabled={processing}
          >
            <span className="paymentRadio" />

            <div>
              <strong>
                Credit / Debit Card
              </strong>

              <p>
                Visa, Mastercard and RuPay
              </p>
            </div>
          </button>
        </div>

        <div className="paymentTotalBox">
          <span>Total Amount</span>

          <strong>
            ₹{booking.fare || 0}
          </strong>
        </div>

        {selectedMethod === "upi" && (
          <div className="paymentUpiNotice">
            On desktop, Razorpay may show a
            QR code. Scan it using a UPI app
            on your phone.
          </div>
        )}

        {statusMessage && (
          <div className="paymentStatusMessage">
            <span />
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="paymentErrorMessage">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          className="payNowButton"
          onClick={startPayment}
          disabled={
            processing ||
            booking.paymentStatus === "Paid"
          }
        >
          {processing
            ? "Please Wait..."
            : booking.paymentStatus ===
                "Paid"
              ? "Payment Completed"
              : selectedMethod === "upi"
                ? `Continue With UPI · ₹${booking.fare || 0}`
                : `Continue With Card · ₹${booking.fare || 0}`}
        </button>

        <div className="paymentSecureText">
          Razorpay Secure Checkout
        </div>
      </section>
    </main>
  );
}

export default Payment;