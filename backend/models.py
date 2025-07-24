from sqlalchemy import Column, Integer, String, Date, Float
from .database import Base

class ProcessedData(Base):
    __tablename__ = "processed_data"

    id = Column(Integer, primary_key=True, index=True)
    personel = Column(String, index=True)
    tarih = Column(Date)
    giris_saat = Column(String)
    cikis_saat = Column(String)
    toplam_dakika = Column(Integer)
    dosya_adi = Column(String) 