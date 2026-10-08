from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, UniqueConstraint
from .database import Base

class Train(Base):
    __tablename__ = "trains"
    id = Column(Integer, primary_key=True); number = Column(String, unique=True)
    name = Column(String); source = Column(String, index=True); destination = Column(String, index=True)
    departure = Column(String); arrival = Column(String)

class Seat(Base):
    __tablename__ = "seats"
    id = Column(Integer, primary_key=True); train_id = Column(Integer, ForeignKey("trains.id"))
    cls = Column(String); number = Column(String); fare = Column(Float)

class Booking(Base):
    __tablename__ = "bookings"
    # CONFIRMED seat rows are the source of truth; CANCELLED rows free the seat via partial logic in service
    id = Column(Integer, primary_key=True); pnr = Column(String, index=True)  # NOT unique: one PNR covers one row per seat
    train_id = Column(Integer, ForeignKey("trains.id")); seat_id = Column(Integer, ForeignKey("seats.id"))
    travel_date = Column(Date); passenger = Column(String); email = Column(String); phone = Column(String)
    amount = Column(Float); status = Column(String, default="CONFIRMED")  # CONFIRMED | CANCELLED
    active_flag = Column(Integer, default=1)  # 1 while confirmed, NULL once cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("train_id", "seat_id", "travel_date", "active_flag", name="uq_active_seat"),)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(String, primary_key=True)  # payment id
    hold_id = Column(String, index=True); pnr = Column(String, nullable=True)
    amount = Column(Float); refund_amount = Column(Float, default=0)
    status = Column(String, default="CREATED")  # CREATED | SUCCESS | FAILED | REFUND_INITIATED | REFUNDED
    created_at = Column(DateTime, default=datetime.utcnow)
