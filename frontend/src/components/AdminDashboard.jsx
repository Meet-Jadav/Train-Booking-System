import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AdminDashboard = () => {
  const { user, logout, API_BASE } = useAuth();
  const navigate = useNavigate();
  const [trains, setTrains] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAddTrain, setShowAddTrain] = useState(false);
  const [editingTrain, setEditingTrain] = useState(null);
  const [newTrain, setNewTrain] = useState({
    train_number: "",
    train_name: "",
    railway_id: 1,
    source_station: "",
    destination_station: "",
    departure_time: "",
    arrival_time: "",
    total_seats: 400,
    base_fare: 0,
    train_type: "Express",
  });
  const [activeTab, setActiveTab] = useState("trains");

  useEffect(() => {
    fetchTrains();
    fetchBookings();
  }, []);

  const fetchTrains = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/trains`);
      setTrains(response.data);
    } catch (error) {
      console.error("Error fetching trains:", error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const addTrain = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/trains`, newTrain);
      setShowAddTrain(false);
      setNewTrain({
        train_number: "",
        train_name: "",
        railway_id: 1,
        source_station: "",
        destination_station: "",
        departure_time: "",
        arrival_time: "",
        total_seats: 400,
        base_fare: 0,
        train_type: "Express",
      });
      fetchTrains();
      alert("Train added successfully!");
    } catch (error) {
      alert(
        "Error adding train: " +
          (error.response?.data?.detail || "Unknown error")
      );
    }
  };

  const updateTrain = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/trains/${editingTrain.train_id}`, editingTrain);
      setEditingTrain(null);
      fetchTrains();
      alert("Train updated successfully!");
    } catch (error) {
      alert(
        "Error updating train: " +
          (error.response?.data?.detail || "Unknown error")
      );
    }
  };

  const deleteTrain = async (trainId) => {
    if (!window.confirm("Are you sure you want to delete this train?")) {
      return;
    }
    
    try {
      await axios.delete(`${API_BASE}/trains/${trainId}`);
      fetchTrains();
      alert("Train deleted successfully!");
    } catch (error) {
      alert(
        "Error deleting train: " +
          (error.response?.data?.detail || "Unknown error")
      );
    }
  };

  const startEditTrain = (train) => {
    setEditingTrain({
      ...train,
      departure_time: new Date(train.departure_time).toISOString().slice(0, 16),
      arrival_time: new Date(train.arrival_time).toISOString().slice(0, 16),
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-content">
          <button
            onClick={() => setActiveTab("trains")}
            className={`nav-button ${activeTab === "trains" ? "active" : ""}`}
          >
            Manage Trains
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`nav-button ${activeTab === "bookings" ? "active" : ""}`}
          >
            All Bookings
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {activeTab === "trains" && (
          <div className="tab-content">
            <div className="card">
              <div className="card-header">
                <h2>Manage Trains</h2>
                <button
                  onClick={() => setShowAddTrain(true)}
                  className="add-button"
                >
                  Add New Train
                </button>
              </div>

              {showAddTrain && (
                <div className="add-flight-form">
                  <h3>Add New Train</h3>
                  <form onSubmit={addTrain} className="flight-form">
                    <input
                      type="text"
                      placeholder="Train Number"
                      value={newTrain.train_number}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          train_number: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Train Name"
                      value={newTrain.train_name}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          train_name: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Source Station"
                      value={newTrain.source_station}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          source_station: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Destination Station"
                      value={newTrain.destination_station}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          destination_station: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="datetime-local"
                      placeholder="Departure Time"
                      value={newTrain.departure_time}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          departure_time: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="datetime-local"
                      placeholder="Arrival Time"
                      value={newTrain.arrival_time}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          arrival_time: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Total Seats"
                      value={newTrain.total_seats}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          total_seats: parseInt(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Base Fare"
                      value={newTrain.base_fare}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          base_fare: parseFloat(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    />
                    <select
                      value={newTrain.train_type}
                      onChange={(e) =>
                        setNewTrain({
                          ...newTrain,
                          train_type: e.target.value,
                        })
                      }
                      className="form-input"
                    >
                      <option value="Express">Express</option>
                      <option value="Superfast">Superfast</option>
                      <option value="Local">Local</option>
                      <option value="Passenger">Passenger</option>
                    </select>
                    <div className="form-actions">
                      <button type="submit" className="submit-button">
                        Add Train
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddTrain(false)}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {editingTrain && (
                <div className="add-flight-form">
                  <h3>Edit Train</h3>
                  <form onSubmit={updateTrain} className="flight-form">
                    <input
                      type="text"
                      placeholder="Train Number"
                      value={editingTrain.train_number}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          train_number: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Train Name"
                      value={editingTrain.train_name}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          train_name: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Source Station"
                      value={editingTrain.source_station}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          source_station: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Destination Station"
                      value={editingTrain.destination_station}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          destination_station: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="datetime-local"
                      placeholder="Departure Time"
                      value={editingTrain.departure_time}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          departure_time: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="datetime-local"
                      placeholder="Arrival Time"
                      value={editingTrain.arrival_time}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          arrival_time: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Total Seats"
                      value={editingTrain.total_seats}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          total_seats: parseInt(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Base Fare"
                      value={editingTrain.base_fare}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          base_fare: parseFloat(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    />
                    <select
                      value={editingTrain.train_type}
                      onChange={(e) =>
                        setEditingTrain({
                          ...editingTrain,
                          train_type: e.target.value,
                        })
                      }
                      className="form-input"
                    >
                      <option value="Express">Express</option>
                      <option value="Superfast">Superfast</option>
                      <option value="Local">Local</option>
                      <option value="Passenger">Passenger</option>
                    </select>
                    <div className="form-actions">
                      <button type="submit" className="submit-button">
                        Update Train
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTrain(null)}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flights-list">
                {trains.map((train) => (
                  <div key={train.train_id} className="flight-card">
                    <div className="flight-info">
                      <h3>{train.train_number} - {train.train_name}</h3>
                      <p className="route">
                        {train.source_station} → {train.destination_station}
                      </p>
                      <p className="flight-time">
                        Departure:{" "}
                        {new Date(train.departure_time).toLocaleString()}
                      </p>
                      <p className="flight-time">
                        Arrival:{" "}
                        {new Date(train.arrival_time).toLocaleString()}
                      </p>
                      <p className="flight-seats">
                        Available Seats: {train.available_seats} /{" "}
                        {train.total_seats}
                      </p>
                      <p className="flight-time">
                        Type: {train.train_type}
                      </p>
                    </div>

                    <div className="flight-actions">
                      <p className="flight-price">₹{train.base_fare}</p>
                      <p
                        className={`flight-status status-${train.train_status}`}
                      >
                        {train.train_status}
                      </p>
                      <div className="flight-buttons">
                        <button
                          onClick={() => startEditTrain(train)}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTrain(train.train_id)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="tab-content">
            <div className="card">
              <h2>All Bookings</h2>

              <div className="bookings-list">
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="booking-card">
                    <div className="booking-info">
                      <h3>PNR: {booking.pnr_number}</h3>
                      {booking.train && (
                        <>
                          <p className="route">
                            <strong>{booking.train.train_number} - {booking.train.train_name}</strong>
                          </p>
                          <p className="route">
                            {booking.train.source_station} → {booking.train.destination_station}
                          </p>
                          <p className="booking-detail">
                            <strong>Departure:</strong> {new Date(booking.train.departure_time).toLocaleString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="booking-detail">
                            <strong>Arrival:</strong> {new Date(booking.train.arrival_time).toLocaleString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </>
                      )}
                      <p className="booking-detail">
                        <strong>User ID:</strong> {booking.user_id} | <strong>Passengers:</strong> {booking.passengers_count}
                      </p>
                      <p className="booking-time">
                        <strong>Booked on:</strong>{" "}
                        {new Date(booking.booking_date).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="booking-status">
                        Status:{" "}
                        <span className={`status-${booking.booking_status}`}>
                          {booking.booking_status}
                        </span>
                      </p>
                    </div>

                    <div className="booking-actions">
                      <p className="booking-amount">₹{booking.total_amount}</p>
                      <p className="payment-status">
                        Payment: {booking.payment_status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
