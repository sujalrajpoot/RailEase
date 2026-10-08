import json, uuid
from datetime import datetime, date as dt
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from .. import models, redis_client as rc
from ..utils import generate_pnr, refund_percent

def create_hold(db, d):
    seats = db.query(models.Seat).filter(models.Seat.id.in_(d.seat_ids), models.Seat.train_id == d.train_id, models.Seat.cls == d.cls).all()
    if len(seats) != len(d.seat_ids): raise HTTPException(404, "Seat not found")
    booked = db.query(models.Booking).filter(models.Booking.seat_id.in_(d.seat_ids), models.Booking.travel_date == d.travel_date, models.Booking.active_flag == 1).count()
    if booked: raise HTTPException(409, "Seat already booked")
    hold_id, acquired = str(uuid.uuid4()), []
    for s in seats:
        k = rc.seat_key(d.train_id, d.travel_date, d.cls, s.id)
        if rc.r.set(k, hold_id, nx=True, ex=rc.TTL): acquired.append(k)
        else:
            for a in acquired: rc.release(a, hold_id)   # all-or-nothing
            raise HTTPException(409, f"Seat {s.number} is being booked by someone else")
    meta = {**json.loads(d.model_dump_json()), "keys": acquired, "amount": sum(s.fare for s in seats)}
    rc.r.set(f"hold:{hold_id}", json.dumps(meta), ex=rc.TTL + 60)
    return {"hold_id": hold_id, "expires_in": rc.TTL, "amount": meta["amount"]}

def get_hold(hold_id):
    raw = rc.r.get(f"hold:{hold_id}")
    if not raw: raise HTTPException(410, "Hold expired")
    meta = json.loads(raw)
    if not all(rc.r.get(k) == hold_id for k in meta["keys"]): raise HTTPException(410, "Hold expired")
    meta["ttl"] = min(rc.r.ttl(k) for k in meta["keys"]); return meta

def release_hold(hold_id):
    raw = rc.r.get(f"hold:{hold_id}")
    if raw:
        for k in json.loads(raw)["keys"]: rc.release(k, hold_id)
        rc.r.delete(f"hold:{hold_id}")

def pay(db, hold_id, success):
    pay = db.query(models.Payment).filter_by(hold_id=hold_id).first()
    if pay and pay.status == "SUCCESS": return {"status": "SUCCESS", "pnr": pay.pnr}  # idempotent
    try: meta = get_hold(hold_id)
    except HTTPException:
        if success and pay:  # money taken after hold expired -> refund
            pay.status = "REFUND_INITIATED"; pay.refund_amount = pay.amount; db.commit()
            raise HTTPException(410, "Hold expired; full refund initiated")
        raise
    if not pay:
        pay = models.Payment(id=str(uuid.uuid4()), hold_id=hold_id, amount=meta["amount"]); db.add(pay)
    if not success:
        pay.status = "FAILED"; db.commit(); release_hold(hold_id); return {"status": "FAILED"}
    pnr = generate_pnr()
    while db.query(models.Booking).filter_by(pnr=pnr).first(): pnr = generate_pnr()
    try:
        fares = {s.id: s.fare for s in db.query(models.Seat).filter(models.Seat.id.in_(meta["seat_ids"]))}
        for sid, px in zip(meta["seat_ids"], meta["passengers"]):  # one PNR, one row per seat/passenger
            db.add(models.Booking(pnr=pnr, train_id=meta["train_id"], seat_id=sid,
                travel_date=dt.fromisoformat(meta["travel_date"]), passenger=px["name"], email=px["email"],
                phone=px["phone"], amount=fares[sid]))
        pay.status, pay.pnr = "SUCCESS", pnr; db.commit()
    except IntegrityError:
        db.rollback()
        pay = db.query(models.Payment).filter_by(hold_id=hold_id).first() or pay
        pay.status = "REFUND_INITIATED"; pay.refund_amount = pay.amount; db.add(pay); db.commit()
        # Only blame the seat if it really is booked; otherwise report a generic save failure.
        taken = db.query(models.Booking).filter(models.Booking.seat_id.in_(meta["seat_ids"]),
            models.Booking.travel_date == dt.fromisoformat(meta["travel_date"]), models.Booking.active_flag == 1).count()
        release_hold(hold_id)
        raise HTTPException(409, "Seat taken; refund initiated" if taken else "Booking could not be saved; refund initiated")
    release_hold(hold_id)
    return {"status": "SUCCESS", "pnr": pnr}

def cancel(db, pnr):
    rows = db.query(models.Booking).filter_by(pnr=pnr, status="CONFIRMED").all()
    if not rows: raise HTTPException(404, "No active booking for this PNR")
    tr = db.get(models.Train, rows[0].train_id)
    dep = datetime.combine(rows[0].travel_date, datetime.strptime(tr.departure, "%H:%M").time())
    pct = refund_percent((dep - datetime.now()).total_seconds() / 3600)
    total = sum(r.amount for r in rows)
    for r in rows: r.status, r.active_flag = "CANCELLED", None   # frees the seat
    p = db.query(models.Payment).filter_by(pnr=pnr).first()
    if p: p.status, p.refund_amount = "REFUND_INITIATED", round(total * pct, 2)
    db.commit()
    return {"pnr": pnr, "status": "CANCELLED", "refund": round(total * pct, 2), "refund_percent": int(pct * 100)}
