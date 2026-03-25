import fitz

def create_dummy_pdf(filename, title, content):
    doc = fitz.open()
    page = doc.new_page()
    page.insert_font(fontname="helv", fontbuffer=fitz.Font("helv").buffer)
    
    text = f"{title}\n\n{content}"
    rect = fitz.Rect(50, 50, 550, 800)
    page.insert_textbox(rect, text, fontsize=12, fontname="helv")
    
    doc.save(filename)
    doc.close()
    print(f"Created {filename}")

create_dummy_pdf("dummy_driving_license.pdf", "Driving License", "Document ID: DL-123456789\nIssue Date: 2023-05-10\nExpiry Date: 2033-05-09\nIssuing Authority: California DMV\nPlace: Sacramento")

create_dummy_pdf("dummy_cert.pdf", "Certificate of Completion", "Document Name: AI Engineer Certificate\nDocument ID: CERT_AI_999\nIssue Date: December 15, 2024\nIssuing Authority: Tech Academy\nPlace: San Francisco, CA")
