from fastapi import FastAPI\napp = FastAPI()\n@app.get("/api/health")\ndef health():\n    return {"status": "ok"}
