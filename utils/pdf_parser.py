import os
import time
from google import genai
from pydantic import BaseModel, Field
from typing import Dict, Any
import json

class FieldEntry(BaseModel):
    key: str = Field(description="The name of the field (e.g., 'Total Amount')")
    value: str = Field(description="The extracted value")

class DynamicDocumentInfo(BaseModel):
    document_type: str = Field(description="The detected type of the document (e.g., Invoice, ID Card, Certificate, Receipt)")
    fields: list[FieldEntry] = Field(description="A list of extracted fields. Only include fields that are present.")

def parse_document_with_ai(filepath: str) -> dict:
    """Uses Google Gemini API to natively process PDF layout and dynamically extract structured information."""
    from dotenv import load_dotenv
    load_dotenv(override=True)
    
    api_key = os.environ.get("GEMINI_API_KEY")
    empty_result = {"document_type": "Unknown", "fields": {}}
    
    if not api_key or api_key == "your_gemini_api_key_here":
        print("Warning: Missing or default GEMINI_API_KEY. Returning empty data.")
        return empty_result
        
    try:
        client = genai.Client(api_key=api_key)
        
        # Upload the file to Gemini
        gemini_file = client.files.upload(file=filepath)
        
        # Wait for file to be ready
        while str(gemini_file.state) in ["PROCESSING", "State.PROCESSING"]:
            time.sleep(2)
            gemini_file = client.files.get(name=gemini_file.name)
            
        if str(gemini_file.state) in ["FAILED", "State.FAILED"]:
            print(f"Error: File upload failed natively in Gemini: {filepath}")
            return empty_result

        prompt = (
            "You are an expert AI document parser. Analyze this document, determine its basic type, "
            "and extract all highly relevant, important data fields as a key-value dictionary. "
            "Extract dates and currency exactly as they appear."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[gemini_file, prompt],
            config={
                'response_mime_type': 'application/json',
                'response_schema': DynamicDocumentInfo,
                'temperature': 0.1,
            },
        )
        
        result = json.loads(response.text)
        
        # Map the list of FieldEntry back to a dictionary for the frontend
        mapped_fields = {}
        for entry in result.get('fields', []):
            mapped_fields[entry['key']] = entry['value']
            
        result['fields'] = mapped_fields
        
        # Clean up the file from Gemini storage
        try:
            client.files.delete(name=gemini_file.name)
        except Exception as cleanup_err:
            print(f"Warning: Failed to delete file {gemini_file.name} from Gemini: {cleanup_err}")
            
        return result
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return empty_result
