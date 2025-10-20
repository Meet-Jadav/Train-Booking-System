from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import secrets

from database import SessionLocal, create_tables, init_data, User, Train, Booking, Payment, Railway
import models
import auth

app = FastAPI(title="Train Booking System", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables and initialize data on startup
@app.on_event("startup")
def startup_event():
    create_tables()
    init_data()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth endpoints
@app.post("/register", response_model=models.UserResponse)
def register(user: models.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(
        (User.username == user.username) | 
        (User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create new user
    hashed_password = auth.get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        phone_number=user.phone_number,
        user_type=user.user_type
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login")
def login(user_data: models.UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not auth.verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = auth.create_access_token(
        data={
            "sub": user.username, 
            "user_type": user.user_type, 
            "user_id": user.user_id
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": user.user_type,
        "user_id": user.user_id
    }

# Train endpoints
@app.get("/trains", response_model=List[models.TrainResponse])
def get_trains(
    source: str = None,
    destination: str = None,
    date: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Train).filter(Train.available_seats > 0)
    
    if source:
        query = query.filter(Train.source_station == source)
    if destination:
        query = query.filter(Train.destination_station == destination)
    if date:
        query = query.filter(Train.departure_time >= date)
    
    return query.all()

@app.post("/trains", response_model=models.TrainResponse)
def create_train(
    train: models.TrainCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_train = Train(
        **train.dict(),
        available_seats=train.total_seats,
        created_by=current_user.user_id
    )
    
    db.add(db_train)
    db.commit()
    db.refresh(db_train)
    return db_train

@app.put("/trains/{train_id}", response_model=models.TrainResponse)
def update_train(
    train_id: int,
    train: models.TrainCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_train = db.query(Train).filter(Train.train_id == train_id).first()
    if not db_train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    # Update train fields
    for key, value in train.dict().items():
        setattr(db_train, key, value)
    
    # Recalculate available seats if total_seats changed
    if train.total_seats != db_train.total_seats:
        # Keep the same number of booked seats
        booked_seats = db_train.total_seats - db_train.available_seats
        db_train.available_seats = train.total_seats - booked_seats
    
    db.commit()
    db.refresh(db_train)
    return db_train

@app.delete("/trains/{train_id}")
def delete_train(
    train_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_train = db.query(Train).filter(Train.train_id == train_id).first()
    if not db_train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    # Check if train has any bookings
    bookings_count = db.query(Booking).filter(Booking.train_id == train_id).count()
    if bookings_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete train with {bookings_count} existing booking(s). Cancel bookings first."
        )
    
    db.delete(db_train)
    db.commit()
    return {"message": "Train deleted successfully", "train_id": train_id}

# Booking endpoints
@app.post("/bookings", response_model=models.BookingResponse)
def create_booking(
    booking: models.BookingCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Get train
    train = db.query(Train).filter(Train.train_id == booking.train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    if train.available_seats < booking.passengers_count:
        raise HTTPException(status_code=400, detail="Not enough seats available")
    
    # Calculate total amount
    total_amount = train.base_fare * booking.passengers_count
    
    # Generate PNR
    pnr_number = secrets.token_hex(5).upper()
    
    # Create booking
    db_booking = Booking(
        user_id=current_user.user_id,
        train_id=booking.train_id,
        passengers_count=booking.passengers_count,
        total_amount=total_amount,
        pnr_number=pnr_number
    )
    
    # Update available seats
    train.available_seats -= booking.passengers_count
    
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # Create payment record
    db_payment = Payment(
        booking_id=db_booking.booking_id,
        payment_amount=total_amount,
        payment_method=booking.payment_method,
        transaction_id=f"TXN{secrets.token_hex(8)}".upper(),
        payment_status="completed"
    )
    
    db.add(db_payment)
    db.commit()
    
    # Update booking payment status
    db_booking.payment_status = "completed"
    db.commit()
    db.refresh(db_booking)
    
    return db_booking

@app.get("/bookings", response_model=List[models.BookingResponse])
def get_user_bookings(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload
    bookings = db.query(Booking).options(joinedload(Booking.train)).filter(Booking.user_id == current_user.user_id).all()
    return bookings

# Admin endpoints
@app.get("/admin/trains", response_model=List[models.TrainResponse])
def get_all_trains(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return db.query(Train).all()

@app.get("/admin/bookings", response_model=List[models.BookingResponse])
def get_all_bookings(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from sqlalchemy.orm import joinedload
    bookings = db.query(Booking).options(joinedload(Booking.train)).all()
    return bookings

# Utility endpoints
@app.get("/stations")
def get_stations(db: Session = Depends(get_db)):
    sources = db.query(Train.source_station).distinct().all()
    destinations = db.query(Train.destination_station).distinct().all()
    
    return {
        "sources": [s[0] for s in sources],
        "destinations": [d[0] for d in destinations]
    }

@app.get("/railways")
def get_railways(db: Session = Depends(get_db)):
    railways = db.query(Railway).all()
    return [{"railway_id": r.railway_id, "railway_name": r.railway_name} for r in railways]

# Health check
@app.get("/")
def read_root():
    return {"message": "Train Booking System API is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)