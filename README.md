# 🛡️ Network Intrusion Detection System (NIDS)

Welcome to the **Network Intrusion Detection System**, a high-performance cybersecurity tool that monitors network traffic in real-time. It leverages classical packet inspection and Machine Learning to detect, classify, and visualize network anomalies and attacks like DDoS, Port Scans, and Probing.

## 🚀 Key Features
- **Real-Time Monitoring**: Live packet capture and high-throughput streaming analysis.
- **Traffic Classification**: Differentiates between normal usage and attacks using ML.
- **Anomaly Detection**: Flags zero-day or unknown anomalous traffic.
- **Interactive Dashboard**: Real-time WebSocket visualizer of the network status and active threats.

## 🏗️ Architecture
- **Sniffer Engine**: Scapy/PyShark (Python)
- **Data Streaming & Storage**: Redis (Broker), InfluxDB (Time-series packet logs), PostgreSQL (Admin/Settings)
- **Backend API**: FastAPI (REST + WebSockets)
- **Frontend Dashboard**: Next.js (React), Recharts, Tailwind CSS
- **AI/ML Engine**: Scikit-Learn (Random Forest), PyTorch/XGBoost (Optional for deep anomalies)

## 📂 Structure
- `/frontend`: Next.js Web Dashboard.
- `/backend`: Asynchronous FastAPI service & WebSockets broker.
- `/sniffer`: Scapy service running silently capturing traffic.
- `/ml-models`: Training notebooks and serialized `.joblib` pipelines.
- `/docs`: Documentation and architecture plans.

---
*Built with ❤️ to keep networks safe.*
