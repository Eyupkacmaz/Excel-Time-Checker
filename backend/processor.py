import pandas as pd
from datetime import timedelta
import re
from sqlalchemy.orm import Session
from sqlalchemy import delete
from . import models

#  Bu fonksiyonun amacı örneğin 1h 30m gibi verilen saat değerini zaman objesin e çevirmektir
def parse_logged_time(logged_str):
    hours = minutes = 0
    if isinstance(logged_str, str):
        h_match = re.search(r"(\d+)\s*h", logged_str)
        m_match = re.search(r"(\d+)\s*m", logged_str)
        if h_match:
            hours = int(h_match.group(1))
        if m_match:
            minutes = int(m_match.group(1))
    return timedelta(hours=hours, minutes=minutes)   

def process_excel(db: Session, file_path: str, filename: str):
    try:
        # Önce bu dosyaya ait eski verileri temizleyelim
        db.execute(delete(models.ProcessedData).where(models.ProcessedData.dosya_adi == filename))
        db.commit()

        df = pd.read_excel(file_path) # dosyayı okuyoruz
        df.columns = [col.strip() for col in df.columns]

        required = ["User", "Worklog", "Logged", "Date"]
        if not all(col in df.columns for col in required):
            return {"error": "Excel sütunları eksik veya yanlış adlandırılmış."}

        df = df[required]
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df = df.dropna(subset=["Date", "Logged"]) # Boş Date veya Logged satırlarını temizler.

        df["LoggedTime"] = df["Logged"].apply(parse_logged_time)
        df["End"] = df["Date"] + df["LoggedTime"]
#Logged süresini timedelta olarak hesaplar.End: Görevin bitiş zamanı = Başlangıç + süre

        result = {}
        all_db_objects = []

        for name, group in df.groupby("User"):
            group = group.sort_values(by="Date")
            jobs = []
            daily_stats = {}  # Günlük çalışma ve mola sürelerini tutar

            for i, row in group.iterrows():
                start = row["Date"]
                end = row["End"]
                task = row["Worklog"]
                duration = row["LoggedTime"]
#Varsayılan değerler: Çakışma yok, mola yok, yeni gün değil, uzun mola değil.
                conflict = False
                mola = ""
                is_new_day = False
                is_long_break = False

                if jobs:
                    previous_end = jobs[-1]["bitis_dt"]
                    previous_date = previous_end.date()
                    current_date = start.date()
#Eğer bir önceki görevin bitişinden önce başlıyorsa çakışma vardır.
                    if start < previous_end:
                        conflict = True #Gün değişmişse, yeni bir güne geçildi.
                    else:
                        if current_date != previous_date:
                            is_new_day = True
                        else:
                            delta = start - previous_end
                            break_minutes = int(delta.total_seconds() // 60)
                            if break_minutes >= 1:
                                mola = f"{break_minutes} dk"
                                if break_minutes > 20:
                                    is_long_break = True

                                # toplam mola süresi gün gün tutuluyor
                                if current_date not in daily_stats:
                                    daily_stats[current_date] = {"work": timedelta(), "break": timedelta()}
                                daily_stats[current_date]["break"] += delta
                else:
                    is_new_day = True

                # Görev süresi günlük toplam çalışma süresine eklenir.
                if start.date() not in daily_stats:
                    daily_stats[start.date()] = {"work": timedelta(), "break": timedelta()}
                daily_stats[start.date()]["work"] += duration

                # Veritabanı için model nesnesi oluştur
                exists = db.query(models.ProcessedData).filter_by(
                    personel=name,
                    tarih=start.date(),
                    giris_saat=start.strftime("%H:%M:%S"),
                    cikis_saat=end.strftime("%H:%M:%S"),
                    toplam_dakika=int(duration.total_seconds() // 60),
                    dosya_adi=filename
                ).first()

                if not exists:
                    db_record = models.ProcessedData(
                        personel=name,
                        tarih=start.date(),
                        giris_saat=start.strftime("%H:%M:%S"),
                        cikis_saat=end.strftime("%H:%M:%S"),
                        toplam_dakika=int(duration.total_seconds() // 60),
                        dosya_adi=filename
                    )
                    all_db_objects.append(db_record)

                jobs.append({ # Bu görev için gerekli bilgiler bir dict olarak kaydedilir.
                    "gorev": task,
                    "baslangic": start.strftime("%Y-%m-%d %H:%M"),
                    "bitis": end.strftime("%Y-%m-%d %H:%M"),
                    "bitis_dt": end,
                    "cakisma_var": conflict,
                    "süre": f"{int(duration.total_seconds() // 60)} dk",
                    "mola": (mola + " ☕ Uzun Mola!") if is_long_break else mola,
                    "is_new_day": is_new_day
                })

            for job in jobs:
                del job["bitis_dt"] # Artık gerekli olmadığı için bu konlonu siliyoruz

            # günlük toplamlar da ekleyelim
            result[name] = {
                "jobs": jobs,
                "daily_stats": {
                    str(date): {
                        "toplam_calisma": f"{int(stats['work'].total_seconds() // 60)} dk",
                        "toplam_mola": f"{int(stats['break'].total_seconds() // 60)} dk"
                    }
                    for date, stats in daily_stats.items()
                }
            }

        # Tüm nesneleri toplu olarak veritabanına ekle
        db.add_all(all_db_objects)
        db.commit()

        return result

    except Exception as e:
        return {"error": f"Excel işlenirken hata oluştu: {str(e)}"}
