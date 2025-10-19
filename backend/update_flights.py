from database import SessionLocal, Flight
from datetime import datetime, timedelta

db = SessionLocal()
try:
    flights = db.query(Flight).all()
    print(f"Updating {len(flights)} flights to have future dates...")
    
    for i, flight in enumerate(flights):
        # Set flights to start from tomorrow and spread them over the next week
        days_offset = 1 + (i % 7)
        flight.departure_time = datetime.now() + timedelta(days=days_offset, hours=8)
        flight.arrival_time = flight.departure_time + timedelta(hours=2)
        print(f"Updated {flight.flight_number}: {flight.source_city}->{flight.destination_city}, New departure: {flight.departure_time}")
    
    db.commit()
    print("\nAll flights updated successfully!")
    
    # Verify
    print("\nCurrent flights:")
    for f in db.query(Flight).all():
        print(f"{f.flight_number}: {f.source_city}->{f.destination_city}, Departs: {f.departure_time}, Available: {f.available_seats}/{f.total_seats}")
        
finally:
    db.close()
