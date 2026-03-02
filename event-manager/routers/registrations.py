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
            "seats_remaining": event.seats_remaining
        })
    return result


@router.post("/{event_id}/waitlist", status_code=201)
def join_waitlist(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.seats_remaining > 0:
        raise HTTPException(status_code=400, detail="Event still has seats available — just register!")
    already_registered = db.query(Registration).filter(
        Registration.user_id == user.id, Registration.event_id == event_id
    ).first()
    if already_registered:
        raise HTTPException(status_code=409, detail="You are already registered for this event")
    already_waitlisted = db.query(Waitlist).filter(
        Waitlist.user_id == user.id, Waitlist.event_id == event_id
    ).first()
    if already_waitlisted:
        raise HTTPException(status_code=409, detail="You are already on the waitlist")
    entry = Waitlist(user_id=user.id, event_id=event_id)
    db.add(entry)
    db.commit()
    position = db.query(Waitlist).filter(Waitlist.event_id == event_id).count()
    return {"message": "Added to waitlist", "position": position}


@router.delete("/{event_id}/waitlist", status_code=200)
def leave_waitlist(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    entry = db.query(Waitlist).filter(
        Waitlist.user_id == user.id, Waitlist.event_id == event_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="You are not on the waitlist")
    db.delete(entry)
    db.commit()
    return {"message": "Removed from waitlist"}


@router.get("/{event_id}/waitlist/status", status_code=200)
def waitlist_status(event_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    entry = db.query(Waitlist).filter(
        Waitlist.user_id == user.id, Waitlist.event_id == event_id
    ).first()
    if not entry:
        return {"on_waitlist": False, "position": None}
    position = db.query(Waitlist).filter(
        Waitlist.event_id == event_id, Waitlist.id <= entry.id
    ).count()
    return {"on_waitlist": True, "position": position}



# --- Routes ---
@router.post("/{event_id}", status_code=201)
def register_for_event(
    event_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)

    # Check event exists
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check event is active
    if event.status != "active":
        raise HTTPException(status_code=400, detail="Event is not active")

    # Check seats available
    if event.seats_remaining <= 0:
        raise HTTPException(status_code=409, detail="Event is fully booked")

    # Check duplicate registration
    existing = db.query(Registration).filter(
        Registration.user_id == user.id,
        Registration.event_id == event_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You are already registered for this event")

    # Register and decrement seat
    booking_id = str(uuid.uuid4())[:8].upper()
    registration = Registration(
        user_id=user.id,
        event_id=event_id,
        booking_id=booking_id
    )
    event.seats_remaining -= 1

    # Update status if now full
    if event.seats_remaining == 0:
        event.status = "sold_out"

    db.add(registration)
    db.commit()
    db.refresh(registration)
    return {
        "message": "Successfully registered",
        "booking_id": booking_id,
        "event": event.title,
        "seats_remaining": event.seats_remaining
    }

@router.delete("/{event_id}", status_code=200)
def cancel_registration(
    event_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)

    registration = db.query(Registration).filter(
        Registration.user_id == user.id,
        Registration.event_id == event_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Restore the seat
    event = db.query(Event).filter(Event.id == event_id).first()
    event.seats_remaining += 1
    if event.status == "sold_out":
        event.status = "active"

    db.delete(registration)
    db.commit()
    return {
        "message": "Registration cancelled",
        "seats_remaining": event.seats_remaining
    }

@router.get("/{event_id}", status_code=200)
def get_registrants(
    event_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
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
        "user_id": r.user_id,
        "user_name": db.query(User).filter(User.id == r.user_id).first().name,
        "user_email": db.query(User).filter(User.id == r.user_id).first().email,
        "booking_id": r.booking_id,
        "registered_at": r.registered_at
    }
    for r in registrations
        ]
    }