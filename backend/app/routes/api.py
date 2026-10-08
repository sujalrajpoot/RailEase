from datetime import date
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas, redis_client as rc
from ..database import get_db
from ..services import booking as svc, notify

router = APIRouter(prefix="/api")


def seat_position(number: str) -> str:
    """2+2 layout: seats 1,4 are window; 2,3 are aisle (repeats every 4 seats)."""
    try:
        return "WINDOW" if int(number) % 4 in (0, 1) else "AISLE"
    except ValueError:
        return "AISLE"


@router.get("/stations")
def stations(db: Session = Depends(get_db)):
    names = {t.source for t in db.query(models.Train)} | {t.destination for t in db.query(models.Train)}
    return sorted(n for n in names if n)

@router.get("/trains/search")
def search(source: str, destination: str, db: Session = Depends(get_db)):
    return db.query(models.Train).filter(models.Train.source.ilike(source), models.Train.destination.ilike(destination)).all()

@router.get("/trains/{train_id}/availability")
def availability(train_id: int, travel_date: date, cls: str, db: Session = Depends(get_db)):
    seats = db.query(models.Seat).filter_by(train_id=train_id, cls=cls).all()
    booked = {b.seat_id for b in db.query(models.Booking).filter_by(train_id=train_id, travel_date=travel_date, active_flag=1)}
    out = []
    for s in seats:
        state = "BOOKED" if s.id in booked else "HELD" if rc.r.exists(rc.seat_key(train_id, travel_date, cls, s.id)) else "FREE"
        out.append({"id": s.id, "number": s.number, "fare": s.fare, "state": state, "position": seat_position(s.number)})
    return out

@router.post("/holds", status_code=201)
def hold(d: schemas.HoldIn, db: Session = Depends(get_db)): return svc.create_hold(db, d)

@router.get("/holds/{hold_id}")
def hold_status(hold_id: str): return svc.get_hold(hold_id)

@router.delete("/holds/{hold_id}", status_code=204)
def drop(hold_id: str): svc.release_hold(hold_id)

@router.post("/payments/{hold_id}")
def pay(hold_id: str, body: schemas.PayIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    meta = svc.get_hold(hold_id)
    res = svc.pay(db, hold_id, body.success)
    if res["status"] == "SUCCESS":
        contacts: dict[tuple, list] = {}  # one confirmation per unique contact, listing their passengers
        for sid, px in zip(meta["seat_ids"], meta["passengers"]):
            contacts.setdefault((px["email"], px["phone"]), []).append({"passenger": px["name"], "seat_id": sid})
        for (email, phone), pax in contacts.items():
            bg.add_task(notify.send_confirmation, email, phone, res["pnr"],
                        {"passengers": pax, "train_id": meta["train_id"], "travel_date": meta["travel_date"]})
    return res

@router.get("/bookings/{pnr}")
def ticket(pnr: str, db: Session = Depends(get_db)):
    rows = db.query(models.Booking).filter_by(pnr=pnr).all()
    if not rows: raise HTTPException(404, "PNR not found")
    t = db.get(models.Train, rows[0].train_id)
    seats = {s.id: s for s in db.query(models.Seat).filter(models.Seat.id.in_([r.seat_id for r in rows]))}
    return {"pnr": pnr, "status": rows[0].status, "train": f"{t.number} {t.name}", "from": t.source, "to": t.destination, # type: ignore
            "departure": t.departure, "date": rows[0].travel_date, # type: ignore
            "passengers": [{"name": r.passenger, "seat": f"{seats[r.seat_id].cls}-{seats[r.seat_id].number}"} for r in rows],
            "seats": [f"{seats[r.seat_id].cls}-{seats[r.seat_id].number}" for r in rows], "amount": sum(r.amount for r in rows)}

@router.post("/bookings/{pnr}/cancel")
def cancel(pnr: str, db: Session = Depends(get_db)): return svc.cancel(db, pnr)
