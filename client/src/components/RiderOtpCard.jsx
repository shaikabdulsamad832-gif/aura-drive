function RiderOtpCard({ booking }) {
  if (!booking?.riderOtp) {
    return null;
  }

  return (
    <div className="riderOtpCard">
      <div className="riderOtpInformation">
        <span>Ride Verification</span>
        <h3>Your Ride OTP</h3>

        <p>
          Share this OTP only after the driver reaches your pickup location.
        </p>
      </div>

      <strong>{booking.riderOtp}</strong>
    </div>
  );
}

export default RiderOtpCard;