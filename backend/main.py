from fastapi import FastAPI, File, UploadFile, Depends
#Web apilerini oluşturmak için kullandım (upload)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from . import models, processor
from .database import SessionLocal, engine
import shutil #Dosya kopyalama , taşıma işlemleri vb.
import os

app = FastAPI() # uygulamayı başlatıyoruz 


# Frontend ile backend'in iletişim kurmasını sağlamak için CORS ayarları yapılır
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ASENKRON TABLO OLUŞTURMA
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/upload") # /upload endpoint'ine gelen POST isteğini yakalayan fonksiyon
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        return {"error": "Lütfen bir Excel dosyası (.xlsx, .xls) yükleyin."}

    file_path = os.path.join(UPLOAD_DIR, file.filename) # kaydedilecek dosyanın tam yolu 

    # Excel dosyasını kaydet
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # İşle ve sonucu döndür
    result = processor.process_excel(db=db, file_path=file_path, filename=file.filename)
    return result

@app.get("/data")
async def get_data(db: Session = Depends(get_db)):
    query = select(models.ProcessedData)
    records = db.execute(query).scalars().all()
    
    # SQLAlchemy nesnelerini JSON'a çevrilebilir dict listesine dönüştür
    return [
        {
            "id": rec.id,
            "personel": rec.personel,
            "tarih": rec.tarih.isoformat() if rec.tarih else None,
            "giris_saat": rec.giris_saat,
            "cikis_saat": rec.cikis_saat,
            "toplam_dakika": rec.toplam_dakika,
            "dosya_adi": rec.dosya_adi,
        }
        for rec in records
    ]

