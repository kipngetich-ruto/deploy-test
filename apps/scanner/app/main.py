from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Cyber Scanner API", version="1.0.0")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "scanner", "active": "Actively reloading"}

@app.post("/scan/ports")
async def scan_ports(target: str, ports: str = "1-1000"):
    """
    Scan ports on target host
    """
    # Port scanning logic here
    return {
        "target": target,
        "ports": ports,
        "status": "completed",
        "results": []
    }

@app.post("/scan/vulnerabilities")
async def scan_vulnerabilities(target: str):
    """
    Scan for vulnerabilities on target
    """
    # Vulnerability scanning logic
    return {
        "target": target,
        "vulnerabilities": [],
        "risk_level": "low"
    }

@app.post("/scan/ssl")
async def scan_ssl(target: str):
    """
    Check SSL/TLS configuration
    """
    return {
        "target": target,
        "ssl_version": "TLS 1.3",
        "certificate_valid": True
    }