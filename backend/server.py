from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
import os
import logging
import uuid
import base64
import asyncio
import httpx
from io import BytesIO

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'barbershop_db')]

# Create the main app
app = FastAPI(title="BarberShop API")

# Create API router with prefix
api_router = APIRouter(prefix="/api")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: str = "client"  # client, barber, admin
    phone: Optional[str] = None
    barbershop_id: Optional[str] = None
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str = "client"
    phone: Optional[str] = None

class Barbershop(BaseModel):
    shop_id: str = Field(default_factory=lambda: f"shop_{uuid.uuid4().hex[:12]}")
    owner_user_id: str
    name: str
    address: str
    phone: str
    description: Optional[str] = None
    photos: List[str] = Field(default_factory=list)  # base64 images
    working_hours: dict = Field(default_factory=dict)  # {"monday": {"open": "09:00", "close": "18:00"}, ...}
    location: Optional[dict] = None  # {"lat": float, "lng": float}
    capacity: Optional[int] = Field(default=None, ge=1, description="Cantidad de sillas o citas simultáneas")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BarbershopCreate(BaseModel):
    owner_user_id: str
    name: str
    address: str
    phone: str
    description: Optional[str] = None
    working_hours: dict = Field(default_factory=dict)
    capacity: Optional[int] = Field(default=None, ge=1)

class Barber(BaseModel):
    barber_id: str = Field(default_factory=lambda: f"barber_{uuid.uuid4().hex[:12]}")
    shop_id: str
    user_id: str
    bio: Optional[str] = None
    specialties: List[str] = Field(default_factory=list)
    portfolio: List[str] = Field(default_factory=list)  # base64 images
    availability: dict = Field(default_factory=dict)  # {"monday": ["09:00-12:00", "14:00-18:00"], ...}
    status: str = "available"  # available, busy, unavailable
    rating: float = 0.0
    total_reviews: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BarberCreate(BaseModel):
    shop_id: str
    user_id: str
    bio: Optional[str] = None
    specialties: List[str] = Field(default_factory=list)
    availability: dict = Field(default_factory=dict)

class Service(BaseModel):
    service_id: str = Field(default_factory=lambda: f"service_{uuid.uuid4().hex[:12]}")
    shop_id: str
    name: str
    description: Optional[str] = None
    price: float
    duration: int  # minutes
    image: Optional[str] = None  # base64
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceCreate(BaseModel):
    shop_id: str
    name: str
    description: Optional[str] = None
    price: float
    duration: int

class Appointment(BaseModel):
    appointment_id: str = Field(default_factory=lambda: f"appt_{uuid.uuid4().hex[:12]}")
    shop_id: str
    barber_id: str
    client_user_id: str
    service_id: str
    scheduled_time: datetime
    status: str = "scheduled"  # scheduled, confirmed, in_progress, completed, cancelled
    notes: Optional[str] = None
    reminder_sent: bool = False
    reminder_24h_sent: bool = False
    reminder_2h_sent: bool = False
    deposit_required: bool = False
    deposit_amount: Optional[float] = Field(default=None, ge=0)
    deposit_status: str = "not_required"  # not_required, pending, paid, failed, refunded
    deposit_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    shop_id: str
    barber_id: str
    client_user_id: str
    service_id: str
    scheduled_time: datetime
    notes: Optional[str] = None
    deposit_required: bool = False
    deposit_amount: Optional[float] = Field(default=None, ge=0)


class RescheduleRequest(BaseModel):
    new_time: datetime
    reason: Optional[str] = None


class Deposit(BaseModel):
    deposit_id: str = Field(default_factory=lambda: f"dep_{uuid.uuid4().hex[:12]}")
    appointment_id: Optional[str] = None
    client_user_id: Optional[str] = None
    amount: float = Field(gt=0)
    currency: str = "USD"
    status: str = "pending"  # pending, paid, failed, cancelled, refunded
    provider: str = "manual"  # manual, stripe, mercado_pago
    payment_url: Optional[str] = None
    metadata: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DepositCreate(BaseModel):
    appointment_id: Optional[str] = None
    client_user_id: Optional[str] = None
    amount: float = Field(gt=0)
    currency: str = "USD"
    provider: str = "manual"
    metadata: Dict[str, str] = Field(default_factory=dict)


class DepositStatusUpdate(BaseModel):
    status: str
    payment_url: Optional[str] = None

class ClientHistory(BaseModel):
    history_id: str = Field(default_factory=lambda: f"hist_{uuid.uuid4().hex[:12]}")
    client_user_id: str
    barber_id: str
    appointment_id: str
    photos: List[str] = Field(default_factory=list)  # base64 images
    preferences: dict = Field(default_factory=dict)  # haircut preferences
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PushToken(BaseModel):
    token_id: str = Field(default_factory=lambda: f"token_{uuid.uuid4().hex[:12]}")
    user_id: str
    token: str
    platform: str  # ios, android, web
    device_info: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PushTokenCreate(BaseModel):
    user_id: str
    token: str
    platform: str
    device_info: Optional[dict] = None


class LoyaltyRules(BaseModel):
    rule_id: str = Field(default="default")
    points_per_completed_appointment: int = Field(default=10, ge=0)
    referral_bonus: int = Field(default=50, ge=0)
    reward_threshold: int = Field(default=200, ge=1)
    reward_description: str = Field(default="Corte gratis o upgrade de servicio")


class LoyaltyWallet(BaseModel):
    user_id: str
    points: int = 0
    referred_by: Optional[str] = None
    history: List[dict] = Field(default_factory=list)


class ReferralRequest(BaseModel):
    user_id: str
    referral_code: str


class AppointmentEarnRequest(BaseModel):
    appointment_id: str


class ClientLog(BaseModel):
    level: str = Field(default="error")
    message: str
    context: Optional[dict] = None
    user_id: Optional[str] = None
    stack: Optional[str] = None
    platform: Optional[str] = None
    screen: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def validate_working_hours(working_hours: dict):
    """Validar formato HH:MM y que la hora de apertura sea menor al cierre."""
    if not working_hours:
        return

    def _valid_time(value: str) -> bool:
        if not isinstance(value, str) or len(value) != 5 or value[2] != ":":
            return False
        hh, mm = value.split(":")
        return hh.isdigit() and mm.isdigit() and 0 <= int(hh) < 24 and 0 <= int(mm) < 60

    for day, schedule in working_hours.items():
        if not isinstance(schedule, dict):
            raise HTTPException(status_code=400, detail=f"Horario inválido para {day}")

        open_time = schedule.get("open")
        close_time = schedule.get("close")

        if not (open_time and close_time and _valid_time(open_time) and _valid_time(close_time)):
            raise HTTPException(status_code=400, detail=f"Formato de horario inválido para {day}. Usa HH:MM")

        if open_time >= close_time:
            raise HTTPException(status_code=400, detail=f"La hora de apertura debe ser menor a cierre para {day}")


def generate_referral_code(email: str) -> str:
    prefix = email.split("@")[0][:4].upper()
    return f"{prefix}{uuid.uuid4().hex[:4].upper()}"


async def ensure_loyalty_rules():
    rules = await db.loyalty_rules.find_one({"rule_id": "default"}, {"_id": 0})
    if not rules:
        default_rules = LoyaltyRules().dict()
        await db.loyalty_rules.insert_one(default_rules)
        return default_rules
    return rules


async def ensure_wallet(user_id: str) -> dict:
    wallet = await db.loyalty_wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        wallet = LoyaltyWallet(user_id=user_id).dict()
        await db.loyalty_wallets.insert_one(wallet)
    return wallet


async def send_push_notification(user_id: str, title: str, body: str):
    try:
        tokens = await db.push_tokens.find({"user_id": user_id}, {"_id": 0, "token": 1}).to_list(10)
        if not tokens:
            return

        async with httpx.AsyncClient(timeout=5) as client_httpx:
            for item in tokens:
                payload = {
                    "to": item.get("token"),
                    "sound": "default",
                    "title": title,
                    "body": body,
                }
                await client_httpx.post("https://exp.host/--/api/v2/push/send", json=payload)
    except Exception as e:
        logger.warning(f"No se pudo enviar push: {e}")


def to_aware_datetime(value: datetime) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            parsed = datetime.now(timezone.utc)
    else:
        parsed = value

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


async def send_sms_placeholder(phone: Optional[str], message: str):
    if not phone:
        return
    # Placeholder para integrar Twilio u otro proveedor en el futuro.
    logger.info(f"[SMS placeholder] to {phone}: {message}")

# ==================== ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "BarberShop API v1.0", "status": "running"}

# ==================== USERS ====================

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    try:
        payload = user_data.dict()
        payload["referral_code"] = generate_referral_code(user_data.email)
        user = User(**payload)
        result = await db.users.insert_one(user.dict())
        return user
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("referral_code"):
        referral_code = generate_referral_code(user.get("email", "user"))
        await db.users.update_one({"user_id": user_id}, {"$set": {"referral_code": referral_code}})
        user["referral_code"] = referral_code
    return user

@api_router.get("/users", response_model=List[User])
async def list_users(role: Optional[str] = None, email: Optional[str] = None, limit: int = 100):
    query = {}
    if role:
        query["role"] = role
    if email:
        query["email"] = email
    users = await db.users.find(query, {"_id": 0}).limit(limit).to_list(limit)
    for user in users:
        if not user.get("referral_code"):
            referral_code = generate_referral_code(user.get("email", "user"))
            await db.users.update_one({"user_id": user.get("user_id")}, {"$set": {"referral_code": referral_code}})
            user["referral_code"] = referral_code
    return users

# ==================== BARBERSHOPS ====================

@api_router.post("/barbershops", response_model=Barbershop)
async def create_barbershop(shop_data: BarbershopCreate):
    try:
        validate_working_hours(shop_data.working_hours)
        shop = Barbershop(**shop_data.dict())
        await db.barbershops.insert_one(shop.dict())
        return shop
    except Exception as e:
        logger.error(f"Error creating barbershop: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/barbershops/{shop_id}", response_model=Barbershop)
async def get_barbershop(shop_id: str):
    shop = await db.barbershops.find_one({"shop_id": shop_id}, {"_id": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    return shop

@api_router.get("/barbershops", response_model=List[Barbershop])
async def list_barbershops(limit: int = 100):
    shops = await db.barbershops.find({}, {"_id": 0}).limit(limit).to_list(limit)
    return shops

@api_router.put("/barbershops/{shop_id}", response_model=Barbershop)
async def update_barbershop(shop_id: str, updates: dict):
    if "working_hours" in updates:
        validate_working_hours(updates.get("working_hours") or {})

    if "capacity" in updates and updates.get("capacity") is not None and updates.get("capacity") < 1:
        raise HTTPException(status_code=400, detail="La capacidad debe ser mayor a 0")

    result = await db.barbershops.update_one(
        {"shop_id": shop_id},
        {"$set": updates}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    shop = await db.barbershops.find_one({"shop_id": shop_id}, {"_id": 0})
    return shop


@api_router.delete("/barbershops/{shop_id}")
async def delete_barbershop(shop_id: str):
    result = await db.barbershops.delete_one({"shop_id": shop_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Barbershop not found")

    await db.barbers.delete_many({"shop_id": shop_id})
    await db.services.delete_many({"shop_id": shop_id})

    return {"message": "Barbershop deleted successfully"}

# ==================== BARBERS ====================

@api_router.post("/barbers", response_model=Barber)
async def create_barber(barber_data: BarberCreate):
    try:
        barber = Barber(**barber_data.dict())
        await db.barbers.insert_one(barber.dict())
        return barber
    except Exception as e:
        logger.error(f"Error creating barber: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/barbers/{barber_id}", response_model=Barber)
async def get_barber(barber_id: str):
    barber = await db.barbers.find_one({"barber_id": barber_id}, {"_id": 0})
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    return barber

@api_router.get("/barbers", response_model=List[Barber])
async def list_barbers(shop_id: Optional[str] = None, limit: int = 100):
    query = {"shop_id": shop_id} if shop_id else {}
    barbers = await db.barbers.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return barbers

@api_router.put("/barbers/{barber_id}", response_model=Barber)
async def update_barber(barber_id: str, updates: dict):
    result = await db.barbers.update_one(
        {"barber_id": barber_id},
        {"$set": updates}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Barber not found")
    barber = await db.barbers.find_one({"barber_id": barber_id}, {"_id": 0})
    return barber


@api_router.delete("/barbers/{barber_id}")
async def delete_barber(barber_id: str):
    result = await db.barbers.delete_one({"barber_id": barber_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Barber not found")
    return {"message": "Barber deleted successfully"}

# ==================== SERVICES ====================

@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate):
    try:
        service = Service(**service_data.dict())
        await db.services.insert_one(service.dict())
        return service
    except Exception as e:
        logger.error(f"Error creating service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str):
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@api_router.get("/services", response_model=List[Service])
async def list_services(shop_id: Optional[str] = None, limit: int = 100):
    query = {"shop_id": shop_id} if shop_id else {}
    services = await db.services.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return services


@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, updates: dict):
    result = await db.services.update_one(
        {"service_id": service_id},
        {"$set": updates}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    return service


@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str):
    result = await db.services.delete_one({"service_id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}

# ==================== APPOINTMENTS ====================

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appt_data: AppointmentCreate):
    try:
        payload = appt_data.dict()
        deposit_required = payload.get("deposit_required", False)
        deposit_amount = payload.get("deposit_amount")

        if deposit_required:
            if deposit_amount is None or deposit_amount <= 0:
                raise HTTPException(status_code=400, detail="El anticipo debe ser mayor a 0 si es requerido")
            payload["deposit_status"] = "pending"
        else:
            payload["deposit_status"] = "not_required"

        appointment = Appointment(**payload)
        await db.appointments.insert_one(appointment.dict())
        return appointment
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/appointments/{appointment_id}", response_model=Appointment)
async def get_appointment(appointment_id: str):
    appt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt

@api_router.get("/appointments", response_model=List[Appointment])
async def list_appointments(
    client_user_id: Optional[str] = None,
    barber_id: Optional[str] = None,
    shop_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if client_user_id:
        query["client_user_id"] = client_user_id
    if barber_id:
        query["barber_id"] = barber_id
    if shop_id:
        query["shop_id"] = shop_id
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return appointments

@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, updates: dict):
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": updates}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    return appt

@api_router.post("/appointments/{appointment_id}/reschedule", response_model=Appointment)
async def reschedule_appointment(appointment_id: str, request: RescheduleRequest):
    appt = await db.appointments.find_one({"appointment_id": appointment_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.get("status") in {"completed", "cancelled"}:
        raise HTTPException(status_code=400, detail="No se puede reprogramar una cita cerrada")

    current_time = to_aware_datetime(appt.get("scheduled_time"))
    new_time = to_aware_datetime(request.new_time)
    now = datetime.now(timezone.utc)

    if new_time <= now:
        raise HTTPException(status_code=400, detail="La nueva hora debe ser futura")

    if current_time - now < timedelta(hours=2):
        raise HTTPException(status_code=400, detail="Solo puedes reprogramar hasta 2 horas antes de la cita")

    updates = {
        "scheduled_time": new_time,
        "status": "scheduled",
        "reminder_24h_sent": False,
        "reminder_2h_sent": False,
        "reminder_sent": False,
        "updated_at": datetime.now(timezone.utc),
    }

    if request.reason:
        updates["notes"] = f"[Reprogramada] {request.reason}"

    await db.appointments.update_one({"appointment_id": appointment_id}, {"$set": updates})
    appt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    return appt


@api_router.post("/appointments/reminders/run")
async def run_appointment_reminders():
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(hours=26)

    appointments = await db.appointments.find({
        "status": {"$in": ["scheduled", "confirmed"]},
        "scheduled_time": {"$lte": horizon}
    }).to_list(length=500)

    reminders_sent = []

    for appt in appointments:
        scheduled_dt = to_aware_datetime(appt.get("scheduled_time"))
        delta = scheduled_dt - now

        client_id = appt.get("client_user_id")
        client = await db.users.find_one({"user_id": client_id}) if client_id else None
        client_phone = client.get("phone") if client else None

        # 24h reminder window: 23h30m to 24h30m
        if (
            not appt.get("reminder_24h_sent")
            and timedelta(hours=23, minutes=30) <= delta <= timedelta(hours=24, minutes=30)
        ):
            title = "Recordatorio de tu cita"
            body = "Te esperamos en 24h. Si necesitas reprogramar, hazlo con más de 2h de anticipación."
            await send_push_notification(client_id, title, body)
            await send_sms_placeholder(client_phone, body)
            await db.appointments.update_one(
                {"appointment_id": appt.get("appointment_id")},
                {"$set": {"reminder_24h_sent": True, "reminder_sent": True, "updated_at": datetime.now(timezone.utc)}}
            )
            reminders_sent.append({"appointment_id": appt.get("appointment_id"), "type": "24h"})

        # 2h reminder window: 90m to 150m
        if (
            not appt.get("reminder_2h_sent")
            and timedelta(minutes=90) <= delta <= timedelta(minutes=150)
        ):
            title = "Tu cita es en 2 horas"
            body = "Confirma tu llegada o reprograma si es necesario."
            await send_push_notification(client_id, title, body)
            await send_sms_placeholder(client_phone, body)
            await db.appointments.update_one(
                {"appointment_id": appt.get("appointment_id")},
                {"$set": {"reminder_2h_sent": True, "updated_at": datetime.now(timezone.utc)}}
            )
            reminders_sent.append({"appointment_id": appt.get("appointment_id"), "type": "2h"})

    return {"sent": reminders_sent, "count": len(reminders_sent)}


@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str):
    result = await db.appointments.delete_one({"appointment_id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted successfully"}

# ==================== PAYMENTS / DEPOSITS ====================


@api_router.post("/payments/deposits", response_model=Deposit)
async def create_deposit(deposit_data: DepositCreate):
    if deposit_data.appointment_id:
        appt = await db.appointments.find_one({"appointment_id": deposit_data.appointment_id})
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")

        if appt.get("deposit_status") == "paid":
            raise HTTPException(status_code=400, detail="La cita ya tiene un anticipo pagado")

    deposit = Deposit(**deposit_data.dict())

    # Placeholder de integración de pago: genera una URL simulada
    payment_url = f"https://payments.example.com/pay/{deposit.deposit_id}"
    deposit.payment_url = payment_url

    await db.deposits.insert_one(deposit.dict())

    if deposit.appointment_id:
        await db.appointments.update_one(
            {"appointment_id": deposit.appointment_id},
            {
                "$set": {
                    "deposit_status": "pending",
                    "deposit_id": deposit.deposit_id,
                    "deposit_amount": deposit.amount,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    return deposit


@api_router.get("/payments/deposits/{deposit_id}", response_model=Deposit)
async def get_deposit(deposit_id: str):
    deposit = await db.deposits.find_one({"deposit_id": deposit_id}, {"_id": 0})
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return deposit


@api_router.post("/payments/deposits/{deposit_id}/confirm", response_model=Deposit)
async def confirm_deposit(deposit_id: str, body: DepositStatusUpdate):
    if body.status not in {"paid", "failed", "cancelled", "refunded"}:
        raise HTTPException(status_code=400, detail="Estado de depósito inválido")

    update_data = {"status": body.status, "updated_at": datetime.now(timezone.utc)}
    if body.payment_url:
        update_data["payment_url"] = body.payment_url

    result = await db.deposits.update_one({"deposit_id": deposit_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deposit not found")

    deposit = await db.deposits.find_one({"deposit_id": deposit_id}, {"_id": 0})

    if deposit and deposit.get("appointment_id"):
        await db.appointments.update_one(
            {"appointment_id": deposit.get("appointment_id")},
            {
                "$set": {
                    "deposit_status": body.status,
                    "deposit_id": deposit_id,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    return deposit

# ==================== CLIENT HISTORY ====================

@api_router.post("/client-history")
async def create_client_history(history: ClientHistory):
    try:
        await db.client_history.insert_one(history.dict())
        return history
    except Exception as e:
        logger.error(f"Error creating client history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/client-history/{client_user_id}")
async def get_client_history(client_user_id: str, limit: int = 50):
    history = await db.client_history.find(
        {"client_user_id": client_user_id},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    return history

# ==================== PUSH TOKENS ====================

@api_router.post("/push-tokens")
async def register_push_token(token_data: PushTokenCreate):
    try:
        # Check if token already exists for this user
        existing = await db.push_tokens.find_one({
            "user_id": token_data.user_id,
            "token": token_data.token
        })
        
        if existing:
            return {"message": "Token already registered"}
        
        token = PushToken(**token_data.dict())
        await db.push_tokens.insert_one(token.dict())
        return {"message": "Token registered successfully"}
    except Exception as e:
        logger.error(f"Error registering push token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/push-tokens/{user_id}")
async def get_user_tokens(user_id: str):
    tokens = await db.push_tokens.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    return tokens

# ==================== LOYALTY & REFERRALS ====================


@api_router.get("/loyalty/rules", response_model=LoyaltyRules)
async def get_loyalty_rules():
    rules = await ensure_loyalty_rules()
    return rules


@api_router.put("/loyalty/rules", response_model=LoyaltyRules)
async def update_loyalty_rules(updates: LoyaltyRules):
    data = updates.dict()
    data["rule_id"] = "default"
    await db.loyalty_rules.update_one(
        {"rule_id": "default"},
        {"$set": data},
        upsert=True,
    )
    return data


@api_router.get("/loyalty/wallet/{user_id}", response_model=LoyaltyWallet)
async def get_loyalty_wallet(user_id: str):
    wallet = await ensure_wallet(user_id)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "referred_by": 1})
    if user:
        wallet["referred_by"] = user.get("referred_by")
    return wallet


@api_router.post("/loyalty/referrals")
async def register_referral(request: ReferralRequest):
    user = await db.users.find_one({"user_id": request.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.get("referred_by"):
        return {"message": "El usuario ya tiene un referido registrado"}

    referrer = await db.users.find_one({"referral_code": request.referral_code})
    if not referrer:
        raise HTTPException(status_code=404, detail="Código de referido inválido")

    await db.users.update_one({"user_id": request.user_id}, {"$set": {"referred_by": referrer.get("user_id")}})
    await db.loyalty_wallets.update_one(
        {"user_id": request.user_id},
        {"$set": {"referred_by": referrer.get("user_id")}},
        upsert=True,
    )

    return {"message": "Referido registrado"}


@api_router.post("/loyalty/earn/appointment")
async def earn_points_from_appointment(request: AppointmentEarnRequest):
    appointment = await db.appointments.find_one({"appointment_id": request.appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if appointment.get("status") != "completed":
        raise HTTPException(status_code=400, detail="La cita debe estar completada para sumar puntos")

    client_id = appointment.get("client_user_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="La cita no tiene cliente asignado")

    rules = await ensure_loyalty_rules()
    wallet = await ensure_wallet(client_id)

    # Evitar duplicados por la misma cita
    already_recorded = any(
        entry.get("source_id") == request.appointment_id and entry.get("type") == "appointment"
        for entry in wallet.get("history", [])
    )
    if already_recorded:
        return wallet

    earned_points = rules.get("points_per_completed_appointment", 0)

    wallet["points"] = wallet.get("points", 0) + earned_points
    wallet.setdefault("history", []).append(
        {
            "type": "appointment",
            "points": earned_points,
            "source_id": request.appointment_id,
            "created_at": datetime.now(timezone.utc),
        }
    )

    await db.loyalty_wallets.update_one(
        {"user_id": client_id},
        {"$set": {"points": wallet["points"], "history": wallet["history"]}},
        upsert=True,
    )

    # Bono por referido tras primera cita completada
    client = await db.users.find_one({"user_id": client_id}, {"_id": 0})
    referrer_id = client.get("referred_by") if client else None
    if referrer_id:
        referrer_wallet = await ensure_wallet(referrer_id)
        has_reward = any(
            entry.get("type") == "referral_bonus" and entry.get("source_id") == client_id
            for entry in referrer_wallet.get("history", [])
        )
        if not has_reward:
            bonus = rules.get("referral_bonus", 0)
            referrer_wallet["points"] = referrer_wallet.get("points", 0) + bonus
            referrer_wallet.setdefault("history", []).append(
                {
                    "type": "referral_bonus",
                    "points": bonus,
                    "source_id": client_id,
                    "created_at": datetime.now(timezone.utc),
                }
            )
            await db.loyalty_wallets.update_one(
                {"user_id": referrer_id},
                {"$set": {"points": referrer_wallet["points"], "history": referrer_wallet["history"]}},
                upsert=True,
            )

            await send_push_notification(
                referrer_id,
                "🎉 Nuevo bono por referido",
                "Tu referido completó su primera cita. Se acreditaron puntos en tu cuenta.",
            )

    # Notificación de recompensa alcanzada
    if wallet.get("points", 0) >= rules.get("reward_threshold", 0):
        await send_push_notification(
            client_id,
            "🎁 ¡Recompensa disponible!",
            f"Has alcanzado {wallet.get('points', 0)} puntos. {rules.get('reward_description')}.",
        )

    return wallet

# ==================== CLIENT LOGS ====================

@api_router.post("/logs")
async def ingest_client_log(entry: ClientLog):
    try:
        payload = entry.dict()
        await db.client_logs.insert_one({**payload, "ingested_at": datetime.now(timezone.utc)})
        log_message = f"Client log [{entry.level}] - {entry.message} | context={entry.context} | screen={entry.screen}"
        if entry.level.lower() in ("warn", "warning"):
            logger.warning(log_message)
        elif entry.level.lower() == "info":
            logger.info(log_message)
        else:
            logger.error(log_message)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error ingesting client log: {e}")
        raise HTTPException(status_code=500, detail="Failed to ingest log")

# ==================== ADMIN DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(shop_id: str):
    try:
        shop = await db.barbershops.find_one({"shop_id": shop_id}, {"_id": 0, "capacity": 1})
        capacity = shop.get("capacity") if shop else None

        # Get all appointments for the shop
        appointments = await db.appointments.find({"shop_id": shop_id}).to_list(length=None)

        total_appointments = len(appointments)
        completed_appointments = len([a for a in appointments if a.get("status") == "completed"])
        total_barbers = await db.barbers.count_documents({"shop_id": shop_id})

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        today_appointments = [
            a for a in appointments
            if today_start <= a.get("scheduled_time", today_start) < today_end
        ]
        today_completed = [a for a in today_appointments if a.get("status") == "completed"]

        status_breakdown = {
            "scheduled": len([a for a in today_appointments if a.get("status") == "scheduled"]),
            "completed": len(today_completed),
            "cancelled": len([a for a in today_appointments if a.get("status") == "cancelled"]),
            "in_progress": len([a for a in today_appointments if a.get("status") == "in_progress"]),
        }

        # Compute ticket average and top services
        service_ids = list({a.get("service_id") for a in appointments if a.get("service_id")})
        services = await db.services.find(
            {"shop_id": shop_id, "service_id": {"$in": service_ids}},
            {"_id": 0, "service_id": 1, "name": 1, "price": 1}
        ).to_list(length=None)
        service_lookup = {s["service_id"]: s for s in services}

        revenue_today = 0.0
        for appt in today_completed:
            service = service_lookup.get(appt.get("service_id"))
            if service:
                revenue_today += float(service.get("price", 0))

        ticket_average = 0.0
        if today_completed:
            ticket_average = revenue_today / len(today_completed)

        service_counts: Dict[str, int] = {}
        for appt in appointments:
            service_id = appt.get("service_id")
            if service_id:
                service_counts[service_id] = service_counts.get(service_id, 0) + 1

        top_services = [
            {
                "service_id": sid,
                "name": service_lookup.get(sid, {}).get("name", "Servicio"),
                "count": count,
                "price": service_lookup.get(sid, {}).get("price"),
            }
            for sid, count in sorted(service_counts.items(), key=lambda item: item[1], reverse=True)[:5]
        ]

        occupancy_rate = None
        if capacity and capacity > 0:
            occupancy_rate = min(100.0, (len(today_appointments) / capacity) * 100)

        recent_appointments = sorted(
            appointments,
            key=lambda a: a.get("scheduled_time", today_start),
            reverse=True,
        )[:5]

        safe_recent = [
            {
                "appointment_id": appt.get("appointment_id"),
                "scheduled_time": appt.get("scheduled_time"),
                "status": appt.get("status"),
            }
            for appt in recent_appointments
        ]

        return {
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "total_barbers": total_barbers,
            "today_appointments": len(today_appointments),
            "status_breakdown": status_breakdown,
            "capacity": capacity,
            "occupancy_rate": occupancy_rate,
            "revenue_today": revenue_today,
            "ticket_average": ticket_average,
            "top_services": top_services,
            "recent_appointments": safe_recent,
            "last_updated": now,
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== AI SCAN (GEMINI) ====================

class AIScanRequest(BaseModel):
    image_base64: str  # Base64 encoded image
    user_id: Optional[str] = None

class AIScanResponse(BaseModel):
    success: bool
    face_shape: Optional[str] = None
    recommendations: List[str] = Field(default_factory=list)
    detailed_analysis: Optional[str] = None
    error: Optional[str] = None

@api_router.post("/ai-scan", response_model=AIScanResponse)
async def analyze_face_for_haircut(request: AIScanRequest):
    """
    Analyzes a face image using Gemini 2.5 Flash to recommend haircut styles.
    """
    try:
        # Get Emergent LLM key
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            logger.error("EMERGENT_LLM_KEY not found in environment")
            return AIScanResponse(
                success=False,
                error="Configuración de IA no disponible"
            )
        
        # Clean base64 image (remove data URL prefix if present)
        image_data = request.image_base64
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        # Initialize Gemini chat with specific system prompt for haircut recommendations
        session_id = f"ai_scan_{uuid.uuid4().hex[:8]}"
        system_message = """Eres un experto estilista y consultor de imagen especializado en cortes de cabello para hombres. 
Tu tarea es analizar la forma del rostro del cliente y proporcionar recomendaciones personalizadas de cortes de cabello.

Debes responder SIEMPRE en formato estructurado así:
FORMA_DEL_ROSTRO: [ovalada/redonda/cuadrada/rectangular/corazón/diamante/triangular]

RECOMENDACIONES:
1. [Nombre del corte] - [Breve descripción de por qué funciona]
2. [Nombre del corte] - [Breve descripción de por qué funciona]
3. [Nombre del corte] - [Breve descripción de por qué funciona]

ANÁLISIS_DETALLADO:
[2-3 oraciones explicando las características faciales y por qué estas recomendaciones son ideales]

CONSEJOS_ADICIONALES:
[1-2 tips de styling o mantenimiento]"""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Create image content
        image_content = ImageContent(image_base64=image_data)
        
        # Create user message with image
        user_message = UserMessage(
            text="Analiza esta foto de mi rostro y recomiéndame los mejores estilos de corte de cabello que complementen mis rasgos faciales. Proporciona al menos 3 recomendaciones específicas.",
            file_contents=[image_content]
        )
        
        # Send message to Gemini
        response = await chat.send_message(user_message)
        
        # Parse the response
        face_shape = None
        recommendations = []
        detailed_analysis = None
        
        if response:
            lines = response.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                if line.startswith('FORMA_DEL_ROSTRO:'):
                    face_shape = line.replace('FORMA_DEL_ROSTRO:', '').strip()
                elif line.startswith('RECOMENDACIONES:'):
                    current_section = 'recommendations'
                elif line.startswith('ANÁLISIS_DETALLADO:'):
                    current_section = 'analysis'
                    detailed_analysis = ''
                elif line.startswith('CONSEJOS_ADICIONALES:'):
                    current_section = 'tips'
                elif current_section == 'recommendations' and (line.startswith(('1.', '2.', '3.', '4.', '5.', '-', '•'))):
                    # Clean the recommendation
                    rec = line.lstrip('0123456789.-•) ').strip()
                    if rec:
                        recommendations.append(rec)
                elif current_section == 'analysis':
                    detailed_analysis = (detailed_analysis or '') + line + ' '
            
            # If parsing didn't work well, use the full response
            if not recommendations:
                recommendations = [response[:500] if len(response) > 500 else response]
            
            if detailed_analysis:
                detailed_analysis = detailed_analysis.strip()
        
        logger.info(f"AI Scan completed successfully for session {session_id}")
        
        # Store the scan result in database for history
        if request.user_id:
            scan_record = {
                "scan_id": f"scan_{uuid.uuid4().hex[:12]}",
                "user_id": request.user_id,
                "face_shape": face_shape,
                "recommendations": recommendations,
                "detailed_analysis": detailed_analysis,
                "created_at": datetime.now(timezone.utc)
            }
            await db.ai_scans.insert_one(scan_record)
        
        return AIScanResponse(
            success=True,
            face_shape=face_shape,
            recommendations=recommendations,
            detailed_analysis=detailed_analysis
        )
        
    except Exception as e:
        logger.error(f"Error in AI scan: {str(e)}")
        return AIScanResponse(
            success=False,
            error=f"Error al analizar la imagen: {str(e)}"
        )

@api_router.get("/ai-scans/{user_id}")
async def get_user_scans(user_id: str, limit: int = 10):
    """Get AI scan history for a user"""
    scans = await db.ai_scans.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return scans

# ==================== AI IMAGE GENERATION ====================

# Reference images for haircut styles (URLs from Unsplash - free to use)
HAIRCUT_REFERENCE_IMAGES = {
    "fade": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400",
    "undercut": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400",
    "pompadour": "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=400",
    "buzz": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "textured": "https://images.unsplash.com/photo-1620122830784-c29a955dd08b?w=400",
    "classic": "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400",
    "mohawk": "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400",
    "crew": "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400",
    "default": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400"
}

def get_reference_image_for_style(style_name: str) -> str:
    """Get reference image URL based on haircut style name"""
    style_lower = style_name.lower()
    for key, url in HAIRCUT_REFERENCE_IMAGES.items():
        if key in style_lower:
            return url
    return HAIRCUT_REFERENCE_IMAGES["default"]

class HaircutStyle(BaseModel):
    name: str
    description: str
    reference_image: Optional[str] = None

class AIScanResponseV2(BaseModel):
    success: bool
    face_shape: Optional[str] = None
    recommendations: List[HaircutStyle] = Field(default_factory=list)
    detailed_analysis: Optional[str] = None
    error: Optional[str] = None

@api_router.post("/ai-scan-v2", response_model=AIScanResponseV2)
async def analyze_face_for_haircut_v2(request: AIScanRequest):
    """
    Enhanced AI scan that includes reference images for each recommendation.
    """
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return AIScanResponseV2(success=False, error="Configuración de IA no disponible")
        
        image_data = request.image_base64
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        session_id = f"ai_scan_v2_{uuid.uuid4().hex[:8]}"
        system_message = """Eres un experto estilista especializado en cortes de cabello para hombres.
Analiza el rostro y proporciona recomendaciones en este formato EXACTO:

FORMA_DEL_ROSTRO: [forma]

CORTE_1:
NOMBRE: [nombre del corte en inglés simple: fade/undercut/pompadour/buzz/textured/classic/mohawk/crew]
DESCRIPCION: [por qué este corte complementa el rostro]

CORTE_2:
NOMBRE: [nombre del corte]
DESCRIPCION: [por qué funciona]

CORTE_3:
NOMBRE: [nombre del corte]
DESCRIPCION: [por qué funciona]

ANALISIS: [análisis detallado de las características faciales]"""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        image_content = ImageContent(image_base64=image_data)
        user_message = UserMessage(
            text="Analiza mi rostro y recomiéndame 3 cortes de cabello ideales.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        face_shape = None
        recommendations = []
        detailed_analysis = None
        
        if response:
            lines = response.split('\n')
            current_cut = {}
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if line.startswith('FORMA_DEL_ROSTRO:'):
                    face_shape = line.replace('FORMA_DEL_ROSTRO:', '').strip()
                elif line.startswith('CORTE_'):
                    if current_cut.get('name'):
                        ref_img = get_reference_image_for_style(current_cut['name'])
                        recommendations.append(HaircutStyle(
                            name=current_cut['name'],
                            description=current_cut.get('description', ''),
                            reference_image=ref_img
                        ))
                    current_cut = {}
                elif line.startswith('NOMBRE:'):
                    current_cut['name'] = line.replace('NOMBRE:', '').strip()
                elif line.startswith('DESCRIPCION:'):
                    current_cut['description'] = line.replace('DESCRIPCION:', '').strip()
                elif line.startswith('ANALISIS:'):
                    detailed_analysis = line.replace('ANALISIS:', '').strip()
            
            # Add last cut
            if current_cut.get('name'):
                ref_img = get_reference_image_for_style(current_cut['name'])
                recommendations.append(HaircutStyle(
                    name=current_cut['name'],
                    description=current_cut.get('description', ''),
                    reference_image=ref_img
                ))
        
        # If parsing failed, create default recommendations
        if not recommendations:
            recommendations = [
                HaircutStyle(name="Fade Clásico", description="Un corte versátil que funciona con la mayoría de formas de rostro", reference_image=HAIRCUT_REFERENCE_IMAGES["fade"]),
                HaircutStyle(name="Undercut Moderno", description="Estilo contemporáneo que añade estructura", reference_image=HAIRCUT_REFERENCE_IMAGES["undercut"]),
                HaircutStyle(name="Texturizado", description="Añade volumen y movimiento natural", reference_image=HAIRCUT_REFERENCE_IMAGES["textured"])
            ]
        
        return AIScanResponseV2(
            success=True,
            face_shape=face_shape,
            recommendations=recommendations,
            detailed_analysis=detailed_analysis
        )
        
    except Exception as e:
        logger.error(f"Error in AI scan v2: {str(e)}")
        return AIScanResponseV2(success=False, error=str(e))

class GenerateHaircutImageRequest(BaseModel):
    user_image_base64: str
    haircut_style: str
    additional_details: Optional[str] = None

class GenerateHaircutImageResponse(BaseModel):
    success: bool
    generated_image_base64: Optional[str] = None
    style_applied: Optional[str] = None
    error: Optional[str] = None

# Emergent proxy URL for API calls
EMERGENT_PROXY_URL = "https://integrations.emergentagent.com/llm"

async def edit_image_with_haircut_gemini(api_key: str, image_base64: str, haircut_style: str) -> Optional[str]:
    """
    Use Gemini Nano Banana to edit the user's photo with a new hairstyle.
    Gemini is better at preserving facial features while only changing the hair.
    Returns base64 encoded image string.
    """
    try:
        session_id = f"hair_edit_{uuid.uuid4().hex[:8]}"
        
        # Very strict prompt to ONLY modify hair
        system_message = """You are a professional photo editor specializing in hairstyle visualization.
Your task is to edit photos to show different hairstyles.

CRITICAL RULES:
- You MUST preserve the person's face EXACTLY as it is
- DO NOT modify: eyes, nose, mouth, ears, skin, facial structure, expression, face shape
- ONLY modify the HAIR on top of the head
- The result must look like the EXACT same person with a new haircut
- Keep the same lighting, background, and photo quality"""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash-image-preview").with_params(modalities=["image", "text"])
        
        # Create image content from base64
        image_content = ImageContent(image_base64=image_base64)
        
        # Strict edit prompt
        edit_prompt = f"""Edit this photo to show a {haircut_style} haircut/hairstyle.

STRICT INSTRUCTIONS:
1. Keep the face, head shape, and all facial features EXACTLY the same - do not change ANYTHING about the face
2. Keep the skin tone, lighting, and background EXACTLY the same
3. ONLY change the hair/hairstyle to a {haircut_style} style
4. The person in the output must be IDENTICAL to the input, just with different hair
5. Do NOT regenerate or modify the face in any way
6. Do NOT change the head shape or size
7. Make the {haircut_style} haircut look natural and professionally styled

Output the edited image."""

        user_message = UserMessage(
            text=edit_prompt,
            file_contents=[image_content]
        )
        
        logger.info(f"Calling Gemini Nano Banana for haircut style: {haircut_style}")
        
        # Get response with image
        text_response, images = await chat.send_message_multimodal_response(user_message)
        
        logger.info(f"Gemini response - Text: {text_response[:100] if text_response else 'None'}...")
        logger.info(f"Gemini response - Images: {len(images) if images else 0}")
        
        if images and len(images) > 0:
            # Return the base64 image data
            img_data = images[0]
            if isinstance(img_data, dict) and 'data' in img_data:
                logger.info(f"Successfully edited photo with Gemini for style: {haircut_style}")
                return img_data['data']  # Already base64 encoded
            elif isinstance(img_data, str):
                return img_data
                
        logger.warning("No image returned from Gemini")
        return None
        
    except Exception as e:
        logger.error(f"Error in edit_image_with_haircut_gemini: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

@api_router.post("/generate-haircut-image", response_model=GenerateHaircutImageResponse)
async def generate_haircut_image(request: GenerateHaircutImageRequest):
    """
    Edit the user's photo to show them with a specific haircut style.
    Uses Gemini Nano Banana to preserve facial features and only change the hair.
    """
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return GenerateHaircutImageResponse(
                success=False,
                error="Configuración de IA no disponible"
            )
        
        # Clean base64 image
        image_data = request.user_image_base64
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        style = request.haircut_style
        
        logger.info(f"Editing user photo with Gemini for haircut style: {style}")
        
        # Use Gemini Nano Banana for better facial preservation
        edited_image_base64 = await edit_image_with_haircut_gemini(api_key, image_data, style)
        
        if edited_image_base64:
            logger.info(f"Successfully edited photo with Gemini for style: {style}")
            
            return GenerateHaircutImageResponse(
                success=True,
                generated_image_base64=edited_image_base64,
                style_applied=style
            )
        else:
            logger.error(f"Gemini image edit failed for style: {style}")
            return GenerateHaircutImageResponse(
                success=False,
                error="No se pudo editar la imagen. Intenta con otra foto."
            )
            
    except Exception as e:
        logger.error(f"Error in generate_haircut_image: {str(e)}")
        return GenerateHaircutImageResponse(
            success=False,
            error=f"Error al procesar imagen: {str(e)}"
        )

# Include router in app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
