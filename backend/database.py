from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import enum
from datetime import datetime
import os

# Use SQLite for simplicity
DATABASE_URL = "sqlite:///./train_booking.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserType(enum.Enum):
    admin = "admin"
    user = "user"

class TrainStatus(enum.Enum):
    scheduled = "scheduled"
    delayed = "delayed"
    cancelled = "cancelled"
    completed = "completed"

class BookingStatus(enum.Enum):
    confirmed = "confirmed"
    pending = "pending"
    cancelled = "cancelled"
    completed = "completed"

class PaymentStatus(enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"

class PaymentMethod(enum.Enum):
    credit_card = "credit_card"
    debit_card = "debit_card"
    upi = "upi"
    net_banking = "net_banking"

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone_number = Column(String(15))
    user_type = Column(String(10), default="user")  # Changed from Enum to String
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    trains_created = relationship("Train", back_populates="creator")
    bookings = relationship("Booking", back_populates="user")

class Railway(Base):
    __tablename__ = "railways"
    
    railway_id = Column(Integer, primary_key=True, index=True)
    railway_name = Column(String(100), nullable=False)
    railway_code = Column(String(5), unique=True, nullable=False)
    contact_number = Column(String(15))
    email = Column(String(100))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    trains = relationship("Train", back_populates="railway")

class Train(Base):
    __tablename__ = "trains"
    
    train_id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(10), unique=True, nullable=False)
    train_name = Column(String(100), nullable=False)
    railway_id = Column(Integer, ForeignKey("railways.railway_id"))
    source_station = Column(String(50), nullable=False)
    destination_station = Column(String(50), nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    total_seats = Column(Integer, nullable=False)
    available_seats = Column(Integer, nullable=False)
    base_fare = Column(Float, nullable=False)
    train_status = Column(String(20), default="scheduled")  # Changed from Enum
    train_type = Column(String(50), default="Express")  # Express, Superfast, Local, etc.
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    railway = relationship("Railway", back_populates="trains")
    creator = relationship("User", back_populates="trains_created")
    bookings = relationship("Booking", back_populates="train")

class Booking(Base):
    __tablename__ = "bookings"
    
    booking_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    train_id = Column(Integer, ForeignKey("trains.train_id"))
    booking_date = Column(DateTime, default=datetime.utcnow)
    passengers_count = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    booking_status = Column(String(20), default="confirmed")  # Changed from Enum
    payment_status = Column(String(20), default="pending")  # Changed from Enum
    pnr_number = Column(String(10), unique=True, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="bookings")
    train = relationship("Train", back_populates="bookings")
    payment = relationship("Payment", back_populates="booking", uselist=False)

class Payment(Base):
    __tablename__ = "payments"
    
    payment_id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id"))
    payment_amount = Column(Float, nullable=False)
    payment_method = Column(String(20), nullable=False)  # Changed from Enum
    payment_date = Column(DateTime, default=datetime.utcnow)
    transaction_id = Column(String(100), unique=True)
    payment_status = Column(String(20), default="pending")  # Changed from Enum
    
    # Relationships
    booking = relationship("Booking", back_populates="payment")

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Initialize with sample data
def init_data():
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            # Create admin user
            admin_user = User(
                username="admin",
                email="admin@railway.com",
                password_hash="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "secret"
                first_name="System",
                last_name="Admin",
                user_type="admin"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        
        # Check if railways exist
        if db.query(Railway).count() == 0:
            railways = [
                Railway(
                    railway_name="Indian Railways",
                    railway_code="IR",
                    contact_number="139",
                    email="contact@indianrailways.gov.in"
                ),
                Railway(
                    railway_name="Metro Railway",
                    railway_code="MR",
                    contact_number="18002001910",
                    email="support@metrorailway.in"
                ),
                Railway(
                    railway_name="Regional Railway",
                    railway_code="RR",
                    contact_number="9876543210",
                    email="info@regionalrailway.in"
                )
            ]
            db.add_all(railways)
            db.commit()
        
        # Check if trains exist
        if db.query(Train).count() == 0:
            from datetime import datetime, timedelta
            trains = [
                Train(
                    train_number="12301",
                    train_name="Rajdhani Express",
                    railway_id=1,
                    source_station="New Delhi",
                    destination_station="Mumbai Central",
                    departure_time=datetime.utcnow() + timedelta(days=1),
                    arrival_time=datetime.utcnow() + timedelta(days=1, hours=16),
                    total_seats=400,
                    available_seats=400,
                    base_fare=1500.00,
                    train_type="Superfast",
                    created_by=admin_user.user_id
                ),
                Train(
                    train_number="12622",
                    train_name="Tamil Nadu Express",
                    railway_id=1,
                    source_station="New Delhi",
                    destination_station="Chennai Central",
                    departure_time=datetime.utcnow() + timedelta(days=1, hours=4),
                    arrival_time=datetime.utcnow() + timedelta(days=2, hours=8),
                    total_seats=350,
                    available_seats=350,
                    base_fare=1200.00,
                    train_type="Express",
                    created_by=admin_user.user_id
                ),
                Train(
                    train_number="12430",
                    train_name="Shatabdi Express",
                    railway_id=1,
                    source_station="Bangalore",
                    destination_station="Chennai",
                    departure_time=datetime.utcnow() + timedelta(days=2),
                    arrival_time=datetime.utcnow() + timedelta(days=2, hours=5),
                    total_seats=300,
                    available_seats=300,
                    base_fare=800.00,
                    train_type="Superfast",
                    created_by=admin_user.user_id
                )
            ]
            db.add_all(trains)
            db.commit()
            
    except Exception as e:
        print(f"Error initializing data: {e}")
    finally:
        db.close()