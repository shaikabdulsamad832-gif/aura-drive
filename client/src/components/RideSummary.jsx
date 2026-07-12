function RideSummary({ cabType, distance, fare, onBook }) {
  return (
    <div className="cabBottomSummary">
      <div>
        <small>Selected Ride</small>
        <b>{cabType}</b>
      </div>

      <div>
        <small>Distance</small>
        <b>{distance} km</b>
      </div>

      <div>
        <small>ETA</small>
        <b>{distance ? `${Math.ceil(distance * 2.2)} min` : "-- min"}</b>
      </div>

      <div>
        <small>Total Fare</small>
        <b className="cyanText">₹{fare}</b>
      </div>

      <button onClick={onBook}>Book Now</button>
    </div>
  );
}

export default RideSummary;