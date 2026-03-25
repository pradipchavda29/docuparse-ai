import os
import time
from google import genai
from pydantic import BaseModel, Field
from typing import Optional
import json

class ExtractedDocumentInfo(BaseModel):
    document_name: Optional[str] = Field(default="", description="The name or title of the document")
    document_id: Optional[str] = Field(default="", description="Any unique ID, Number, or reference found on the document")
    issue_date: Optional[str] = Field(default="", description="The date the document was issued")
    expiry_date: Optional[str] = Field(default="", description="The date the document expires, if applicable")
    issuing_authority: Optional[str] = Field(default="", description="The organization or entity that issued the document")
    place: Optional[str] = Field(default="", description="The place or location of issue")

def parse_document_with_ai(filepath: str) -> dict:
    """Uses Google Gemini API to natively process PDF layout and extract structured information."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        print("Warning: Missing or default GEMINI_API_KEY. Returning empty data.")
        return ExtractedDocumentInfo().model_dump()
        
    try:
        client = genai.Client(api_key=api_key)
        
        # Upload the file to Gemini
        gemini_file = client.files.upload(file=filepath)
        
        # Wait for file to be ready (mostly applicable to large documents)
        while str(gemini_file.state) in ["PROCESSING", "State.PROCESSING"]:
            time.sleep(2)
            gemini_file = client.files.get(name=gemini_file.name)
            
        if str(gemini_file.state) in ["FAILED", "State.FAILED"]:
            print(f"Error: File upload failed natively in Gemini: {filepath}")
            return ExtractedDocumentInfo().model_dump()

        prompt = (
            "You are an expert AI document parser. Analyze this document and extract the specified fields. "
            "If a field cannot be found or determined, leave it blank (empty string). "
            "Be extremely precise and rely only on the document content. Extract dates exactly as they appear."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[gemini_file, prompt],
            config={
                'response_mime_type': 'application/json',
                'response_schema': ExtractedDocumentInfo,
                'temperature': 0.1,
            },
        )
        
        result = json.loads(response.text)
        
        # Clean up the file from Gemini storage
        try:
            client.files.delete(name=gemini_file.name)
        except Exception as cleanup_err:
            print(f"Warning: Failed to delete file {gemini_file.name} from Gemini: {cleanup_err}")
            
        return result
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return ExtractedDocumentInfo().model_dump()
