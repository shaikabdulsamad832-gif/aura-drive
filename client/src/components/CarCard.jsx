function CarCard({ car, selected, onSelect }) {
  return (
    <div className={`cabCarCard ${selected ? "activeCabCar" : ""}`} onClick={onSelect}>
      <div className="etaPill">{car.time}</div>

      <div className="cabCarImageBox">
        <img src={car.image} alt={car.name} draggable="false" className="carImage" />
      </div>

      <div className="cabCarContent">
        <h3>{car.name}</h3>
        <p>{car.description}</p>

        <div className="cabFeatures">
          <span>👤 {car.seats}</span>
          <span>❄ AC</span>
          <span>⭐ 4.9</span>
        </div>

        <div className="cabPriceRow">
          <div>
            <small>Starting From</small>
            <b>₹{car.rate}/km</b>
          </div>

          <button>{selected ? "Selected" : "Select"}</button>
        </div>
      </div>
    </div>
  );
}

export default CarCard;