function Profile() {
  const user = JSON.parse(localStorage.getItem("user")) || {};

  return (
    <main className="page">
      <h1>Profile</h1>

      <div className="profileCard">
        <div className="avatar">{(user.name || "A")[0]}</div>
        <h2>{user.name || "Aura User"}</h2>
        <p>{user.email || "Not logged in"}</p>
        <p>{user.phone || "Phone not added"}</p>
      </div>
    </main>
  );
}

export default Profile;