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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BarbershopCreate(BaseModel):
    owner_user_id: str
    name: str
    address: str
    phone: str
    description: Optional[str] = None
    working_hours: dict = Field(default_factory=dict)

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    shop_id: str
    barber_id: str
    client_user_id: str
    service_id: str
    scheduled_time: datetime
    notes: Optional[str] = None

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

# ==================== ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "BarberShop API v1.0", "status": "running"}

# ==================== USERS ====================

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    try:
        user = User(**user_data.dict())
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
    return user

@api_router.get("/users", response_model=List[User])
async def list_users(role: Optional[str] = None, email: Optional[str] = None, limit: int = 100):
    query = {}
    if role:
        query["role"] = role
    if email:
        query["email"] = email
    users = await db.users.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return users

# ==================== BARBERSHOPS ====================

@api_router.post("/barbershops", response_model=Barbershop)
async def create_barbershop(shop_data: BarbershopCreate):
    try:
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
    result = await db.barbershops.update_one(
        {"shop_id": shop_id},
        {"$set": updates}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    shop = await db.barbershops.find_one({"shop_id": shop_id}, {"_id": 0})
    return shop

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

# ==================== APPOINTMENTS ====================

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appt_data: AppointmentCreate):
    try:
        appointment = Appointment(**appt_data.dict())
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

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str):
    result = await db.appointments.delete_one({"appointment_id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted successfully"}

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

# ==================== ADMIN DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(shop_id: str):
    try:
        # Count appointments by status
        total_appointments = await db.appointments.count_documents({"shop_id": shop_id})
        completed_appointments = await db.appointments.count_documents({
            "shop_id": shop_id,
            "status": "completed"
        })
        
        # Count barbers
        total_barbers = await db.barbers.count_documents({"shop_id": shop_id})
        
        # Get today's appointments
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        today_appointments = await db.appointments.count_documents({
            "shop_id": shop_id,
            "scheduled_time": {"$gte": today_start, "$lt": today_end}
        })
        
        return {
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "total_barbers": total_barbers,
            "today_appointments": today_appointments
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
