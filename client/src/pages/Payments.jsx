import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import logo from "../assets/logo.png";
import mini from "../assets/cars/mini.png";
import sedan from "../assets/cars/sedan.png";
import suv from "../assets/cars/suv.png";
import luxury from "../assets/cars/luxury.png";
import "./Payment.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const vehicleImages = {
  Mini: mini,
  Sedan: sedan,
  SUV: suv,
  Luxury: luxury,
};

const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) ||
        JSON.stringify(fallback)
    );

    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () =>
        resolve(true)
      );

      existingScript.addEventListener("error", () =>
        resolve(false)
      );

      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

function Payment() {
  const navigate = useNavigate();

  const [booking, setBooking] = useState(() =>
    readJson("latestBooking", null)
  );

  const [selectedMethod, setSelectedMethod] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] = useState("");

  const user = useMemo(() => {
    return (
      readJson("auraUser", null) ||
      readJson("user", null) ||
      readJson("currentUser", null) ||
      {}
    );
  }, []);

  useEffect(() => {
    const latestBooking = readJson(
      "latestBooking",
      null
    );

    setBooking(latestBooking);

    if (
      latestBooking &&
      latestBooking.status !== "Customer Dropped" &&
      latestBooking.driverPhase !== "completed"
    ) {
      setMessage(
        "Payment becomes available only after the customer is dropped."
      );
    }
  }, []);

  const paymentAllowed = Boolean(
    booking &&
      (booking.status === "Customer Dropped" ||
        booking.driverPhase === "completed") &&
      booking.paymentStatus !== "Paid"
  );

  const updatePaidBooking = useCallback(
    (payment) => {
      const storedBookings = readJson(
        "auraBookings",
        []
      );

      const updatedBooking = {
        ...booking,
        paymentStatus: "Paid",
        paymentRequired: false,
        paymentId: payment.paymentId,
        razorpayOrderId: payment.orderId,
        paymentMethod: payment.method,
        paidAt: payment.paidAt,
      };

      const updatedBookings = Array.isArray(
        storedBookings
      )
        ? storedBookings.map((ride) =>
            ride.id === booking.id
              ? updatedBooking
              : ride
          )
        : [updatedBooking];

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

      if (activeDriverRide?.id === booking.id) {
        localStorage.setItem(
          "activeDriverRide",
          JSON.stringify({
            ...activeDriverRide,
            paymentStatus: "Paid",
            paymentRequired: false,
            paymentId: payment.paymentId,
            razorpayOrderId: payment.orderId,
            paymentMethod: payment.method,
            paidAt: payment.paidAt,
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
    },
    [booking, navigate]
  );

  const verifyPayment = useCallback(
    async (response) => {
      const verificationResponse =
        await axios.post(
          `${API_URL}/api/payments/verify`,
          {
            razorpay_order_id:
              response.razorpay_order_id,
            razorpay_payment_id:
              response.razorpay_payment_id,
            razorpay_signature:
              response.razorpay_signature,
            rideId: booking.id,
          }
        );

      if (
        verificationResponse.data?.success !== true
      ) {
        throw new Error(
          verificationResponse.data?.message ||
            "Payment verification failed"
        );
      }

      updatePaidBooking(
        verificationResponse.data.payment
      );
    },
    [booking, updatePaidBooking]
  );

  const getCheckoutConfiguration = (method) => {
    const methodName =
      method === "upi"
        ? "UPI Payment"
        : "Credit or Debit Card";

    return {
      display: {
        blocks: {
          selectedMethod: {
            name: methodName,
            instruments: [
              {
                method,
              },
            ],
          },
        },
        sequence: ["block.selectedMethod"],
        preferences: {
          show_default_blocks: false,
        },
      },
    };
  };

  const startPayment = async (method) => {
    if (!booking) {
      setMessage("No ride was found for payment");
      return;
    }

    if (!paymentAllowed) {
      setMessage(
        booking.paymentStatus === "Paid"
          ? "This ride has already been paid."
          : "Payment becomes available after the ride is completed."
      );

      return;
    }

    try {
      setSelectedMethod(method);
      setProcessing(true);
      setMessage("");

      const scriptLoaded =
        await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load Razorpay Checkout"
        );
      }

      const orderResponse = await axios.post(
        `${API_URL}/api/payments/create-order`,
        {
          rideId: booking.id,
          amount: booking.fare,
          cabType: booking.cabType,
        }
      );

      if (orderResponse.data?.success !== true) {
        throw new Error(
          orderResponse.data?.message ||
            "Unable to create payment order"
        );
      }

      const checkout = new window.Razorpay({
        key: orderResponse.data.keyId,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        order_id: orderResponse.data.orderId,
        name: "Aura Drive",
        description: `${booking.cabType} ride payment`,
        image: logo,
        config: getCheckoutConfiguration(method),
        prefill: {
          name:
            user.name ||
            user.fullName ||
            "",
          email: user.email || "",
          contact:
            user.phone ||
            user.mobile ||
            "",
        },
        notes: {
          rideId: booking.id,
          pickup:
            booking.pickup?.name || "",
          destination:
            booking.drop?.name || "",
        },
        theme: {
          color: "#d4af37",
        },
        handler: async (response) => {
          try {
            setProcessing(true);
            setMessage(
              "Verifying your payment..."
            );

            await verifyPayment(response);
          } catch (error) {
            setMessage(
              error.response?.data?.message ||
                error.message ||
                "Payment verification failed"
            );

            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setSelectedMethod("");
            setMessage(
              "Payment window was closed. You can try again."
            );
          },
          confirm_close: true,
          escape: true,
        },
      });

      checkout.on(
        "payment.failed",
        (response) => {
          setProcessing(false);

          setMessage(
            response.error?.description ||
              response.error?.reason ||
              "Payment failed. Please try again."
          );
        }
      );

      checkout.open();
    } catch (error) {
      setProcessing(false);
      setSelectedMethod("");

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to start payment"
      );
    }
  };

  if (!booking) {
    return (
      <main className="auraPaymentPage">
        <section className="paymentEmptyState">
          <img src={logo} alt="Aura Drive" />

          <h1>No payment found</h1>

          <p>
            Complete a ride before opening the payment
            page.
          </p>

          <button
            type="button"
            onClick={() => navigate("/")}
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auraPaymentPage">
      <div className="paymentBackgroundGlow paymentGlowOne" />
      <div className="paymentBackgroundGlow paymentGlowTwo" />

      <section className="paymentPageShell">
        <header className="paymentHeader">
          <div className="paymentBrand">
            <img src={logo} alt="Aura Drive" />

            <div>
              <span>Aura Drive</span>
              <h1>Complete Payment</h1>
            </div>
          </div>

          <button
            type="button"
            className="paymentBackButton"
            onClick={() => navigate("/my-bookings")}
          >
            My Bookings
          </button>
        </header>

        <div className="paymentLayout">
          <section className="paymentRideCard">
            <div className="paymentRideHeading">
              <div>
                <span>Completed Ride</span>
                <h2>Ride Summary</h2>
              </div>

              <div className="paymentCompletedBadge">
                ✓ Customer Dropped
              </div>
            </div>

            <div className="paymentVehicle">
              <div className="paymentVehicleImage">
                <div className="paymentVehicleGlow" />

                <img
                  src={
                    vehicleImages[booking.cabType] ||
                    sedan
                  }
                  alt={booking.cabType}
                />
              </div>

              <div>
                <span>Selected Vehicle</span>
                <h3>{booking.cabType}</h3>
                <p>{booking.distance} km completed</p>
              </div>
            </div>

            <div className="paymentRoute">
              <div>
                <span className="paymentPickupDot" />

                <div>
                  <small>Pickup</small>
                  <p>{booking.pickup?.name}</p>
                </div>
              </div>

              <span className="paymentRouteLine" />

              <div>
                <span className="paymentDropDot" />

                <div>
                  <small>Destination</small>
                  <p>{booking.drop?.name}</p>
                </div>
              </div>
            </div>

            <div className="paymentDriver">
              <div className="paymentDriverAvatar">
                {(booking.assignedDriver?.name || "D")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <span>Aura Driver</span>

                <h3>
                  {booking.assignedDriver?.name ||
                    "Aura Driver"}
                </h3>

                <p>
                  {booking.assignedDriver
                    ?.vehicleNumber ||
                    "Verified Driver"}
                </p>
              </div>
            </div>

            <div className="paymentFareDetails">
              <div>
                <span>Ride Fare</span>
                <b>₹{booking.fare}</b>
              </div>

              <div>
                <span>Platform Fee</span>
                <b>Included</b>
              </div>

              <div className="paymentTotal">
                <span>Total Amount</span>
                <strong>₹{booking.fare}</strong>
              </div>
            </div>
          </section>

          <aside className="paymentMethodsCard">
            <div className="paymentMethodsHeading">
              <span>Secure Checkout</span>
              <h2>Select Payment Method</h2>

              <p>
                Your payment information is handled
                securely by Razorpay.
              </p>
            </div>

            <button
              type="button"
              className={`paymentMethodButton ${
                selectedMethod === "upi"
                  ? "selected"
                  : ""
              }`}
              disabled={processing || !paymentAllowed}
              onClick={() => startPayment("upi")}
            >
              <div className="paymentMethodIcon">
                UPI
              </div>

              <div>
                <h3>UPI</h3>

                <p>
                  Pay using Google Pay, PhonePe, Paytm or
                  another UPI app
                </p>
              </div>

              <span className="paymentMethodArrow">
                →
              </span>
            </button>

            <button
              type="button"
              className={`paymentMethodButton ${
                selectedMethod === "card"
                  ? "selected"
                  : ""
              }`}
              disabled={processing || !paymentAllowed}
              onClick={() => startPayment("card")}
            >
              <div className="paymentMethodIcon">
                CARD
              </div>

              <div>
                <h3>Credit or Debit Card</h3>

                <p>
                  Pay securely with Visa, Mastercard or
                  RuPay
                </p>
              </div>

              <span className="paymentMethodArrow">
                →
              </span>
            </button>

            <div className="paymentSecurityBox">
              <span>🔒</span>

              <div>
                <h4>Secure Payment</h4>

                <p>
                  Card and UPI authentication happens
                  inside Razorpay Checkout.
                </p>
              </div>
            </div>

            <div className="paymentAmountButton">
              <span>Amount Payable</span>
              <strong>₹{booking.fare}</strong>
            </div>

            {processing && (
              <div className="paymentProcessing">
                <span />

                <p>
                  {selectedMethod === "upi"
                    ? "Opening UPI payment..."
                    : selectedMethod === "card"
                      ? "Opening card payment..."
                      : "Processing payment..."}
                </p>
              </div>
            )}

            {message && (
              <div className="paymentMessage">
                {message}
              </div>
            )}

            {booking.paymentStatus === "Paid" && (
              <button
                type="button"
                className="alreadyPaidButton"
                onClick={() =>
                  navigate("/payment-success")
                }
              >
                View Payment Receipt
              </button>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Payment;