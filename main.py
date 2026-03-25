from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import shutil
from dotenv import load_dotenv

from utils.pdf_parser import parse_document_with_ai

load_dotenv()

app = FastAPI(title="Document AI Reader")

# Ensure static and temp directories exist
os.makedirs("static", exist_ok=True)
os.makedirs("temp_uploads", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/temp_uploads", StaticFiles(directory="temp_uploads"), name="temp_uploads")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main index.html file for the frontend."""
    try:
        with open("static/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Frontend not found. Please create static/index.html</h1>", status_code=404)

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Process a single document upload and return extracted details."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    # Save the file temporarily
    file_path = os.path.join("temp_uploads", file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse the document
        parsed_data = parse_document_with_ai(file_path)
        
        # Include fields required by frontend specifically
        parsed_data['raw_filename'] = file.filename
        parsed_data['preview_url'] = f"/temp_uploads/{file.filename}"
        
        return JSONResponse(content=parsed_data)
        
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
