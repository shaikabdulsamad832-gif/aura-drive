function BookingPanel({
  pickup,
  drop,
  distance,
  fare,
  onPickupClick,
  onDropClick,
}) {
  return (
    <div className="auraBookingPanel">
      <div className="auraBookingHeader">
        <span>PRIVATE RIDE EXPERIENCE</span>
        <h2>Where are you going?</h2>
        <p>The calmest distance between two points</p>
      </div>

      <div className="auraLocationStack">
        <button className="auraLocationCard" onClick={onPickupClick}>
          <span className="auraDot pickupDot"></span>

          <div>
            <small>Pickup location</small>
            <h3>{pickup?.name || "Choose your pickup point"}</h3>
          </div>
        </button>

        <button className="auraLocationCard" onClick={onDropClick}>
          <span className="auraDot dropDot"></span>

          <div>
            <small>Destination</small>
            <h3>{drop?.name || "Choose your destination"}</h3>
          </div>
        </button>
      </div>

      <div className="auraRouteStats">
        <div>
          <span>Distance</span>
          <h3>{distance ? `${distance} km` : "--"}</h3>
        </div>

        <div>
          <span>Estimated fare</span>
          <h3>{fare ? `₹${fare}` : "--"}</h3>
        </div>
      </div>
    </div>
  );
}

export default BookingPanel;