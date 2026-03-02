from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from .auth import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
import uuid
from models import Registration, Event, User, Waitlist

router = APIRouter(prefix="/registrations", tags=["Registrations"])

# --- Auth helper ---
def get_current_user(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- /my ---
@router.get("/my", status_code=200)
def get_my_registrations(token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    registrations = db.query(Registration).filter(Registration.user_id == user.id).all()
    result = []
    for r in registrations:
        event = db.query(Event).filter(Event.id == r.event_id).first()
        result.append({
            "booking_id": r.booking_id,
            "registered_at": r.registered_at,
            "event_id": r.event_id,
            "event_title": event.title,
            "event_date": event.date,
            "event_location": event.location,
            "event_status": event.status,
            "seats_remaining": event.seats_remaining,
            "payment_status": r.payment_status,
            "event_cost": event.cost,
        })
    return result

# --- Waitlist routes ---
@router.post("/{event_id}/waitlist", status_code=201)
def join_waitlist(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.seats_remaining > 0:
        raise HTTPException(status_code=400, detail="Event still has seats available — just register!")
    if db.query(Registration).filter(Registration.user_id == user.id, Registration.event_id == event_id).first():
        raise HTTPException(status_code=409, detail="You are already registered for this event")
    if db.query(Waitlist).filter(Waitlist.user_id == user.id, Waitlist.event_id == event_id).first():
        raise HTTPException(status_code=409, detail="You are already on the waitlist")
    db.add(Waitlist(user_id=user.id, event_id=event_id))
    db.commit()
    position = db.query(Waitlist).filter(Waitlist.event_id == event_id).count()
    return {"message": "Added to waitlist", "position": position}

@router.delete("/{event_id}/waitlist", status_code=200)
def leave_waitlist(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    entry = db.query(Waitlist).filter(Waitlist.user_id == user.id, Waitlist.event_id == event_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="You are not on the waitlist")
    db.delete(entry)
    db.commit()
    return {"message": "Removed from waitlist"}

@router.get("/{event_id}/waitlist/status", status_code=200)
def waitlist_status(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    entry = db.query(Waitlist).filter(Waitlist.user_id == user.id, Waitlist.event_id == event_id).first()
    if not entry:
        return {"on_waitlist": False, "position": None}
    position = db.query(Waitlist).filter(Waitlist.event_id == event_id, Waitlist.id <= entry.id).count()
    return {"on_waitlist": True, "position": position}

# --- Payment approval routes ---
@router.post("/{event_id}/approve/{registration_id}", status_code=200)
def approve_payment(event_id: int, registration_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.role != "admin" and event.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    reg = db.query(Registration).filter(Registration.id == registration_id, Registration.event_id == event_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.payment_status != "pending_payment":
        raise HTTPException(status_code=400, detail="Registration is not pending payment")
    reg.payment_status = "confirmed"
    db.commit()
    return {"message": "Payment approved", "booking_id": reg.booking_id}

@router.post("/{event_id}/reject/{registration_id}", status_code=200)
def reject_payment(event_id: int, registration_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.role != "admin" and event.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    reg = db.query(Registration).filter(Registration.id == registration_id, Registration.event_id == event_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.payment_status != "pending_payment":
        raise HTTPException(status_code=400, detail="Registration is not pending payment")
    # Restore the seat
    event.seats_remaining += 1
    if event.status == "sold_out":
        event.status = "active"
    db.delete(reg)
    db.commit()
    return {"message": "Payment rejected, seat restored"}

# --- Main registration routes ---
@router.post("/{event_id}", status_code=201)
def register_for_event(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "active":
        raise HTTPException(status_code=400, detail="Event is not active")
    if event.seats_remaining <= 0:
        raise HTTPException(status_code=409, detail="Event is fully booked")
    if db.query(Registration).filter(Registration.user_id == user.id, Registration.event_id == event_id).first():
        raise HTTPException(status_code=409, detail="You are already registered for this event")

    booking_id = str(uuid.uuid4())[:8].upper()
    payment_status = "pending_payment" if event.cost > 0 else "confirmed"

    registration = Registration(
        user_id=user.id,
        event_id=event_id,
        booking_id=booking_id,
        payment_status=payment_status
    )
    event.seats_remaining -= 1
    if event.seats_remaining == 0:
        event.status = "sold_out"

    db.add(registration)
    db.commit()
    db.refresh(registration)
    return {
        "message": "Successfully registered" if payment_status == "confirmed" else "Seat held — awaiting payment confirmation",
        "booking_id": booking_id,
        "payment_status": payment_status,
        "event": event.title,
        "seats_remaining": event.seats_remaining,
        "upi_id": event.upi_id if payment_status == "pending_payment" else None,
    }

@router.delete("/{event_id}", status_code=200)
def cancel_registration(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    registration = db.query(Registration).filter(
        Registration.user_id == user.id, Registration.event_id == event_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    event = db.query(Event).filter(Event.id == event_id).first()
    event.seats_remaining += 1
    if event.status == "sold_out":
        event.status = "active"
    db.delete(registration)
    db.commit()
    return {"message": "Registration cancelled", "seats_remaining": event.seats_remaining}

@router.get("/{event_id}", status_code=200)
def get_registrants(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.role != "admin" and event.organizer_id != user.id:
        raise HTTPException(status_code=403, detail="Only the organizer can view registrants")
    registrations = db.query(Registration).filter(Registration.event_id == event_id).all()
    return {
        "event": event.title,
        "total_seats": event.total_seats,
        "seats_remaining": event.seats_remaining,
        "registrants": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "user_name": db.query(User).filter(User.id == r.user_id).first().name,
                "user_email": db.query(User).filter(User.id == r.user_id).first().email,
                "booking_id": r.booking_id,
                "payment_status": r.payment_status,
                "registered_at": r.registered_at,
            }
            for r in registrations
        ]
    }