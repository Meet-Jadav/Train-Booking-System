from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User Models
class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    phone_number: Optional[str] = None

class UserCreate(UserBase):
    password: str
    user_type: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    user_id: int
    user_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Train Models
class TrainBase(BaseModel):
    train_number: str
    train_name: str
    railway_id: int
    source_station: str
    destination_station: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    base_fare: float
    train_type: Optional[str] = "Express"

class TrainCreate(TrainBase):
    pass

class TrainResponse(TrainBase):
    train_id: int
    available_seats: int
    train_status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Booking Models
class BookingBase(BaseModel):
    train_id: int
    passengers_count: int

class BookingCreate(BookingBase):
    payment_method: str

class BookingResponse(BaseModel):
    booking_id: int
    user_id: int
    train_id: int
    booking_date: datetime
    passengers_count: int
    total_amount: float
    booking_status: str
    payment_status: str
    pnr_number: str
    train: Optional['TrainResponse'] = None

    class Config:
        from_attributes = True

# Railway Models
class RailwayBase(BaseModel):
    railway_name: str
    railway_code: str
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None

class RailwayResponse(RailwayBase):
    railway_id: int
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_id: int