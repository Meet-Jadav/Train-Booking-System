from database import SessionLocal, Train
from datetime import datetime, timedelta

db = SessionLocal()
try:
    trains = db.query(Train).all()
    print(f"Updating {len(trains)} trains to have future dates...")
    
    for i, train in enumerate(trains):
        # Set trains to start from tomorrow and spread them over the next week
        days_offset = 1 + (i % 7)
        train.departure_time = datetime.now() + timedelta(days=days_offset, hours=8)
        
        # Calculate travel time based on train type
        if train.train_type == "Superfast":
            hours = 4
        elif train.train_type == "Express":
            hours = 6
        else:
            hours = 8
            
        train.arrival_time = train.departure_time + timedelta(hours=hours)
        print(f"Updated {train.train_number} ({train.train_name}): {train.source_station}->{train.destination_station}, New departure: {train.departure_time}")
    
    db.commit()
    print("\nAll trains updated successfully!")
    
    # Verify
    print("\nCurrent trains:")
    for t in db.query(Train).all():
        print(f"{t.train_number} ({t.train_name}): {t.source_station}->{t.destination_station}, Departs: {t.departure_time}, Available: {t.available_seats}/{t.total_seats}, Type: {t.train_type}")
        
finally:
    db.close()
