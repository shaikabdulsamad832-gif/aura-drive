import mini from "../assets/cars/mini.png";
import sedan from "../assets/cars/sedan.png";
import suv from "../assets/cars/suv.png";
import luxury from "../assets/cars/luxury.png";

function VehicleSlider({ cabType, setCabType, distance }) {
  const vehicles = [
    {
      name: "Mini",
      image: mini,
      price: 15,
      seats: 4,
      eta: "3 min",
      desc: "Affordable city ride",
    },
    {
      name: "Sedan",
      image: sedan,
      price: 20,
      seats: 4,
      eta: "5 min",
      desc: "Premium comfort",
    },
    {
      name: "SUV",
      image: suv,
      price: 28,
      seats: 6,
      eta: "7 min",
      desc: "Spacious family ride",
    },
    {
      name: "Luxury",
      image: luxury,
      price: 45,
      seats: 4,
      eta: "10 min",
      desc: "Executive class",
    },
  ];

  return (
    <div className="vehicleList">
      {vehicles.map((v) => (
        <button
          key={v.name}
          onClick={() => setCabType(v.name)}
          className={cabType === v.name ? "vehicle activeVehicle" : "vehicle"}
        >
          <img src={v.image} alt={v.name} className="vehicleImage" />

          <div className="vehicleDetails">
            <h4>{v.name}</h4>
            <p>{v.desc}</p>
            <span>
              {v.seats} seats • {v.eta}
            </span>
          </div>

          <b>₹{distance ? Math.round(distance * v.price) : `${v.price}/km`}</b>
        </button>
      ))}
    </div>
  );
}

export default VehicleSlider;