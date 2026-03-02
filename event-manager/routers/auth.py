from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

from database import get_db
from models import User
from fastapi import APIRouter, Depends, HTTPException, Query
load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "fallbacksecret")
router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET", "fallbacksecret")
ALGORITHM = "HS256"
def get_current_user(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Schemas ---
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# --- Routes ---
@router.post("/signup", status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    hashed = pwd_context.hash(data.password)
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hashed,
        phone=data.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created successfully", "user_id": user.id}

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = jwt.encode({"sub": str(user.id), "email": user.email, "role": user.role}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "role": user.role}


class AssignRoleRequest(BaseModel):
    email: str
    role: str  # "user", "organizer", "admin"

@router.put("/assign-role")
def assign_role(data: AssignRoleRequest, token: str = Query(...), db: Session = Depends(get_db)):
    requesting_user = get_current_user(token, db)
    if requesting_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign roles")
    target = db.query(User).filter(User.email == data.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if data.role not in ("user", "organizer", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    target.role = data.role
    db.commit()
    return {"message": f"{target.name} is now a {data.role}"}

@router.get("/me")
def get_me(token: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

@router.post("/make-admin")
def make_admin(email: str = Query(...), secret: str = Query(...), db: Session = Depends(get_db)):
    if secret != os.getenv("JWT_SECRET"):
        raise HTTPException(status_code=403, detail="Invalid secret")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = "admin"
    db.commit()
    return {"message": f"{user.name} is now an admin"}