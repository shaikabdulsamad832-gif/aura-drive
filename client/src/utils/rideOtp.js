const PERMANENT_RIDE_OTP = "4826";

export const generateUniqueRideOtp = () => {
  localStorage.setItem(
    "permanentRideOtp",
    PERMANENT_RIDE_OTP
  );

  return PERMANENT_RIDE_OTP;
};

export const getPermanentRideOtp = () => {
  const storedOtp = localStorage.getItem(
    "permanentRideOtp"
  );

  if (storedOtp !== PERMANENT_RIDE_OTP) {
    localStorage.setItem(
      "permanentRideOtp",
      PERMANENT_RIDE_OTP
    );
  }

  return PERMANENT_RIDE_OTP;
};