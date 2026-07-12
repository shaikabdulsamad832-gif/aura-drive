import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import mini from "../assets/cars/mini.png";
import sedan from "../assets/cars/sedan.png";
import suv from "../assets/cars/suv.png";
import luxury from "../assets/cars/luxury.png";

function DriverSearchModal({ booking, onClose, onTrack }) {
  const [found, setFound] = useState(false);

  const carImages = {
    Mini: mini,
    Sedan: sedan,
    SUV: suv,
    Luxury: luxury,
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFound(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="driverOverlay">
      <div className="driverModal">
        {!found ? (
          <div className="searchingDriver">
            <img src={logo} alt="Aura Drive" className="searchLogo" />

            <div className="driverLoader">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <h2>Searching nearby drivers...</h2>
            <p>Finding the best premium driver for your ride</p>
          </div>
        ) : (
          <div className="driverFound">
            <div className="driverTop">
              <img src={logo} alt="Aura" />

              <div>
                <h2>Driver Found</h2>
                <p>Your Aura Ride is confirmed</p>
              </div>
            </div>

            <div className="driverProfile">
              <div className="driverAvatar">A</div>

              <div>
                <h3>Ahmed Khan</h3>
                <p>⭐ 4.9 • 2,430 rides</p>
              </div>

              <span>4 min</span>
            </div>

            <div className="driverCarBox">
              <img src={carImages[booking.cabType]} alt={booking.cabType} />

              <div>
                <h3>{booking.cabType}</h3>
                <p>TS09 AB 4832</p>
              </div>
            </div>

            <div className="rideOtpBox">
              <span>Ride OTP</span>
              <h2>4837</h2>
            </div>

            <div className="driverRideInfo">
              <div>
                <span>Distance</span>
                <b>{booking.distance} km</b>
              </div>

              <div>
                <span>Fare</span>
                <b>₹{booking.fare}</b>
              </div>

              <div>
                <span>Status</span>
                <b>Arriving</b>
              </div>
            </div>

            <div className="driverActions">
              <button onClick={onClose} className="cancelRideBtn">
                Close
              </button>

              <button onClick={onTrack} className="trackRideBtn">
                Track Ride
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DriverSearchModal;