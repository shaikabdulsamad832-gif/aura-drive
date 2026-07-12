import {
  useEffect,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import logo from "../assets/logo.png";
import "./PaymentSuccess.css";

const readJson = (
  key,
  fallback = null
) => {
  try {
    const storedValue =
      localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    return JSON.parse(storedValue);
  } catch {
    return fallback;
  }
};

function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  const [booking, setBooking] =
    useState(
      location.state?.booking ||
        readJson(
          "latestBooking",
          null
        )
    );

  const [seconds, setSeconds] =
    useState(4);

  useEffect(() => {
    const successfulBooking =
      location.state?.booking ||
      readJson(
        "latestBooking",
        null
      );

    if (successfulBooking) {
      setBooking(successfulBooking);

      localStorage.setItem(
        "latestBooking",
        JSON.stringify(
          successfulBooking
        )
      );
    }
  }, [location.state]);

  useEffect(() => {
    const countdownInterval =
      window.setInterval(() => {
        setSeconds((current) =>
          current > 1
            ? current - 1
            : 1
        );
      }, 1000);

    const redirectTimer =
      window.setTimeout(() => {
        navigate("/", {
          replace: true,
        });
      }, 4000);

    return () => {
      window.clearInterval(
        countdownInterval
      );

      window.clearTimeout(
        redirectTimer
      );
    };
  }, [navigate]);

  if (!booking) {
    return (
      <main className="auraSuccessPage">
        <section className="successEmptyCard">
          <img
            src={logo}
            alt="Aura Drive"
            className="successEmptyLogo"
          />

          <h1>Payment Successful</h1>

          <p>
            Returning to the home screen.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/", {
                replace: true,
              })
            }
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  const amountPaid =
    booking.paymentAmount ||
    booking.fare ||
    0;

  const paymentMethod = String(
    booking.paymentMethod ||
      "Online"
  ).toUpperCase();

  return (
    <main className="auraSuccessPage">
      <div className="successGlow successGlowOne" />
      <div className="successGlow successGlowTwo" />

      <section className="successReceiptCard">
        <div className="successBrand">
          <img
            src={logo}
            alt="Aura Drive"
          />

          <div>
            <span>Aura Drive</span>
            <h2>Payment Receipt</h2>
          </div>
        </div>

        <div className="successCheckWrap">
          <div className="successCheck">
            <span>✓</span>
          </div>
        </div>

        <div className="successHeading">
          <span>
            Payment Successful
          </span>

          <h1>
            Thank You For Riding With Aura
          </h1>

          <p>
            Your payment has been verified
            and your ride is completed.
          </p>
        </div>

        <div className="successAmount">
          <span>Amount Paid</span>

          <strong>
            ₹{amountPaid}
          </strong>

          <small>
            Securely processed by Razorpay
          </small>
        </div>

        <div className="successStatusRow">
          <div>
            <span>Ride Status</span>
            <strong>Completed</strong>
          </div>

          <div>
            <span>Payment Status</span>
            <strong className="paidText">
              Paid
            </strong>
          </div>
        </div>

        <div className="successReceiptGrid">
          <div>
            <span>Ride ID</span>

            <strong>
              {booking.id ||
                booking._id ||
                "AURA-RIDE"}
            </strong>
          </div>

          <div>
            <span>Vehicle</span>

            <strong>
              {booking.cabType ||
                "Aura Ride"}
            </strong>
          </div>

          <div>
            <span>
              Payment Method
            </span>

            <strong>
              {paymentMethod}
            </strong>
          </div>

          <div>
            <span>Payment ID</span>

            <strong>
              {booking.paymentId ||
                "Verified"}
            </strong>
          </div>
        </div>

        <div className="successRedirectBox">
          Returning to home in{" "}
          <strong>{seconds}</strong>{" "}
          seconds
        </div>

        <button
          type="button"
          className="successPrimaryButton successHomeButton"
          onClick={() =>
            navigate("/", {
              replace: true,
            })
          }
        >
          Return Home Now
        </button>
      </section>
    </main>
  );
}

export default PaymentSuccess;