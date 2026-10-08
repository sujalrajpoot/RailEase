# RailEase
Seat hold in Redis (`SET seat_hold:{train}:{date}:{class}:{seat} <hold_id> NX EX 600`) -> payment -> DB booking + 10-digit PNR -> Redis key deleted.

## Run
Backend: `cd backend && pip install -r requirements.txt && python -m uvicorn main:app --reload`
Frontend (React + TypeScript + Tailwind + Vite): `cd frontend && npm install && npm run dev`

## Design notes
- 409 when NX fails; multi-seat holds are all-or-nothing.
- Release uses a Lua compare-and-delete so one user cannot free another's hold.
- DB unique constraint (train, seat, date, active_flag) is the final guard against double booking.
- Payment states: CREATED, SUCCESS, FAILED, REFUND_INITIATED, REFUNDED. Payment arriving after hold expiry triggers a full refund.
- Refunds: more than 24h before departure 80%, 4 to 24h 50%, under 4h none.
- Email/SMS are logging stubs in services/notify.py.
