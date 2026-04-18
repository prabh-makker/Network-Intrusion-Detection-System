import subprocess
import time
import sys
import os

def start_backend():
    print("🚀 Starting Backend API (Port 8001)...")
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8001"],
        cwd=os.path.join(os.getcwd(), "backend")
    )

def start_frontend():
    print("🎨 Starting Frontend Dashboard (Port 3000)...")
    # Using 'npm run dev' for development, would be 'npm start' in production
    return subprocess.Popen(
        ["npm.cmd", "run", "dev"],
        cwd=os.path.join(os.getcwd(), "frontend"),
        shell=True
    )

def start_sniffer():
    print("🛡️ Starting AI Sniffer (Admin Mode)...")
    # Note: On Windows, the sniffer usually needs to be run in its own Admin window
    # We will trigger the batch file we created
    return subprocess.Popen(
        ["start", "cmd", "/c", "start_sniffer.bat"],
        cwd=os.path.join(os.getcwd(), "sniffer"),
        shell=True
    )

def main():
    print("===================================================")
    print("   NIDS Sentinel: Master Deployment Orchestrator")
    print("===================================================\n")
    
    processes = []
    try:
        # 1. Start Backend
        backend = start_backend()
        processes.append(backend)
        time.sleep(5) # Wait for backend to initialize
        
        # 2. Start Frontend
        frontend = start_frontend()
        processes.append(frontend)
        
        # 3. Start Sniffer
        sniffer = start_sniffer()
        # We don't append sniffer because it opens in its own window
        
        print("\n✅ All systems are online!")
        print("🔗 Dashboard: http://localhost:3000")
        print("🔗 API Docs: http://localhost:8001/docs")
        print("\nPress Ctrl+C to shut down all services.")
        
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down NIDS Sentinel...")
        for p in processes:
            p.terminate()
        print("👋 Goodbye.")

if __name__ == "__main__":
    main()
