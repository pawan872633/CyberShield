# 🛡️ CyberShield

CyberShield is a **Machine Learning + Cybersecurity Automation System** with:

- 🚀 Real-time Anomaly Detection
- 🔎 ML-powered threat scoring (IsolationForest)
- 🛑 Automatic Firewall Blocking (Windows)
- 📊 Interactive Dashboard (React + Bootstrap)
- 📝 Detection history + CSV Export
- 🚫 Blacklist Management with unblock support

---

## ⚡ Features
- **FastAPI Backend** → ML Model + DB + APIs
- **React Frontend** → Dashboard + Blacklist UI
- **SQLite** → Lightweight database
- **Windows Firewall Integration** → Auto blocking malicious IPs
- **MongoDB (optional)** → Event logging

---

## 🛠️ Tech Stack
- **Backend:** FastAPI, SQLAlchemy, Joblib, Loguru
- **Frontend:** React.js, Bootstrap 5, Axios
- **Database:** SQLite + MongoDB (optional)
- **ML:** Scikit-learn (IsolationForest)

---

## 🚀 Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
