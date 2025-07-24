import { useState } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Lütfen bir Excel dosyası seçin.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile); // Excel dosyasını bir FormData nesnesine koyar (çünkü FastAPI bunu bekliyor)

    try {
      //fetch() ile backend’e POST isteği gönderilir. Bu istek /upload endpoint’ine gider.
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
//Eğer HTTP isteği başarısızsa, hata fırlatılır.Başarılıysa, dönen veri JSON formatında okunur ve response state’ine kaydedilir.

      const data = await res.json();
      setResponse(data);

    } catch (err) {
      alert("Yükleme başarısız: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>📊 Excel Dosyası Yükleyici</h1>
        <p style={subtitleStyle}>Excel dosyanızı yükleyin ve görev planınızı analiz edin</p>
      </div>

      <div style={uploadSectionStyle}>
        <div style={fileInputWrapperStyle}>
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={handleFileChange}
            style={fileInputStyle}
            id="fileInput"
          />
          <label htmlFor="fileInput" style={fileLabelStyle}>
            📁 {selectedFile ? selectedFile.name : "Dosya Seç"}
          </label>
        </div>

        <button 
          onClick={handleUpload} 
          disabled={!selectedFile || loading}
          style={{
            ...uploadButtonStyle,
            ...((!selectedFile || loading) ? disabledButtonStyle : {})
          }}
        >
          {loading ? "🔄 Yükleniyor..." : "⬆️ Yükle"}
        </button>
      </div>

      {response && ( // backend den veri geldiyse bu bölüm görünür
        <div style={resultsStyle}>
          <h2 style={resultsTitleStyle}>📋 Analiz Sonuçları</h2>
          {Object.entries(response).map(([username, data]) => (
            <div key={username} style={userSectionStyle}>
              <h3 style={userNameStyle}>👤 {username}</h3>
              {Object.entries(data.daily_stats).map(([date, stats]) => (
                <p key={date} style={{ marginBottom: 10, fontSize: 14 ,color:'black'}}>
                  📅 <strong>{date}</strong> | 🕓 <strong>Çalışma:</strong> {stats.toplam_calisma} | ☕ <strong>Mola:</strong> {stats.toplam_mola}
                </p>
              ))}
              <div style={tableWrapperStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={headerRowStyle}>
                      <th style={thStyle}>📝 Görev</th>
                      <th style={thStyle}>🕐 Başlangıç</th>
                      <th style={thStyle}>🕕 Bitiş</th>
                      <th style={thStyle}>🕒 Süre</th>
                      <th style={thStyle}>⚠️ Çakışma</th>
                      <th style={thStyle}>☕ Mola</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.map((job, index) => (
                      <tr
                        key={index}
                        style={{
                          borderTop: job.is_new_day ? '3px solid #2c3e50' : '1px solid #ccc'
                        }}
                      >
                        <td style={tdStyle}><pre style={preStyle}>{job.gorev}</pre></td>
                        <td style={tdStyle}>{job.baslangic}</td>
                        <td style={tdStyle}>{job.bitis}</td>
                        <td style={tdStyle}>{job.süre}</td>
                        <td style={{ 
                          ...tdStyle, 
                          ...conflictStyle,
                          color: job.cakisma_var ? "#e74c3c" : "#27ae60",
                          fontWeight: "bold"
                        }}>
                          {job.cakisma_var ? "⚠️ Evet" : "✅ Hayır"}
                        </td>
                        <td style={tdStyle}>{job.mola || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stil tanımlamaları
const containerStyle = {
  width: "1500px",
  margin: "0",
  padding: "20px",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  backgroundColor: "#f8f9fa",
  minHeight: "100vh",
  boxSizing: "border-box",
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "40px",
  padding: "30px",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const titleStyle = {
  color: "#2c3e50",
  fontSize: "2.5em",
  margin: "0 0 10px 0",
  fontWeight: "600",
};

const subtitleStyle = {
  color: "#7f8c8d",
  fontSize: "1.1em",
  margin: "0",
  fontWeight: "400",
};

const uploadSectionStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "20px",
  marginBottom: "40px",
  padding: "30px",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const fileInputWrapperStyle = {
  position: "relative",
  display: "inline-block",
};

const fileInputStyle = {
  position: "absolute",
  opacity: 0,
  width: "100%",
  height: "100%",
  cursor: "pointer",
};

const fileLabelStyle = {
  display: "inline-block",
  padding: "12px 24px",
  backgroundColor: "#ecf0f1",
  border: "2px dashed #bdc3c7",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
  color: "#2c3e50",
  transition: "all 0.3s ease",
  minWidth: "200px",
  textAlign: "center",
};

const uploadButtonStyle = {
  padding: "12px 30px",
  backgroundColor: "#3498db",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  minWidth: "150px",
};

const disabledButtonStyle = {
  backgroundColor: "#bdc3c7",
  cursor: "not-allowed",
};

const resultsStyle = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "30px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const resultsTitleStyle = {
  color: "#2c3e50",
  fontSize: "1.8em",
  marginBottom: "30px",
  textAlign: "center",
  fontWeight: "600",
};

const userSectionStyle = {
  marginBottom: "40px",
  padding: "20px",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  border: "1px solid #e9ecef",
};

const userNameStyle = {
  color: "#34495e",
  fontSize: "1.3em",
  marginBottom: "20px",
  fontWeight: "600",
  padding: "10px",
  backgroundColor: "#e8f4f8",
  borderRadius: "6px",
  border: "1px solid #d4edda",
};

const tableWrapperStyle = {
  width: "100%",
  overflowX: "auto",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "white",
  border: "2px solid #34495e",
  borderRadius: "8px",
  overflow: "hidden",
};

const headerRowStyle = {
  backgroundColor: "#34495e",
  color: "white",
};

const thStyle = {
  padding: "15px 12px",
  border: "1px solid #2c3e50",
  textAlign: "left",
  fontWeight: "600",
  fontSize: "14px",
};



const tdStyle = {
  color:"black",
  padding: "12px",
  verticalAlign: "top",
  border: "1px solid #ccc",
  fontSize: "14px",
};

const preStyle = {
  margin: "0",
  fontFamily: "inherit",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  maxWidth: "300px",
};

const conflictStyle = {
  textAlign: "center",
  fontSize: "13px",
};

export default App;