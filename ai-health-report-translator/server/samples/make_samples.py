"""Generate synthetic sample lab reports (PDF with text layer, and a PNG for OCR).
Usage: python3 samples/make_samples.py   (needs: pip install reportlab pillow)
All names and values are made up."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
ROWS = [
    ("COMPLETE BLOOD COUNT", None, None, None),
    ("Hemoglobin", "11.4", "g/dL", "12.0 - 15.0"),
    ("Total WBC Count", "11,600", "cells/cumm", "4,000 - 11,000"),
    ("Platelet Count", "2,45,000".replace(",", ""), "/cumm", "150000 - 450000"),
    ("MCV", "79", "fL", "80 - 100"),
    ("LIPID PROFILE", None, None, None),
    ("Total Cholesterol", "226", "mg/dL", "< 200"),
    ("HDL Cholesterol", "39", "mg/dL", "> 40"),
    ("LDL Cholesterol", "146", "mg/dL", "Up to 130"),
    ("Triglycerides", "172", "mg/dL", "0 - 150"),
    ("LIVER & KIDNEY", None, None, None),
    ("SGPT (ALT)", "38", "U/L", "7 - 56"),
    ("SGOT (AST)", "29", "U/L", "10 - 40"),
    ("Serum Creatinine", "0.82", "mg/dL", "0.6 - 1.1"),
    ("Blood Urea", "27", "mg/dL", "15 - 40"),
    ("THYROID & VITAMINS", None, None, None),
    ("TSH (Ultrasensitive)", "5.2", "µIU/mL", "0.4 - 4.0"),
    ("Vitamin D (25-OH)", "21", "ng/mL", "30 - 100"),
    ("Vitamin B12", "265", "pg/mL", "200 - 900"),
    ("HbA1c", "5.8", "%", "4.0 - 5.6"),
    ("Fasting Blood Sugar", "102", "mg/dL", "70 - 100"),
]

def make_pdf(path):
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    c.setFont("Helvetica-Bold", 16); c.drawString(50, h - 60, "SAMPLE DIAGNOSTICS LAB (synthetic)")
    c.setFont("Helvetica", 10)
    c.drawString(50, h - 80, "Patient Name: Test Person          Age/Sex: 30 Y / F")
    c.drawString(50, h - 95, "Report Date: 15/11/2026            Ref. By: Dr. Sample")
    y = h - 130
    c.setFont("Helvetica-Bold", 10)
    for x, t in zip((50, 250, 330, 430), ("Test", "Result", "Unit", "Reference Range")):
        c.drawString(x, y, t)
    y -= 20
    for name, val, unit, ref in ROWS:
        if val is None:
            c.setFont("Helvetica-Bold", 10); c.drawString(50, y, name); y -= 16; continue
        c.setFont("Helvetica", 10)
        for x, t in zip((50, 250, 330, 430), (name, val, unit, ref)):
            c.drawString(x, y, t)
        y -= 16
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(50, 40, "This is a synthetic report generated for testing the AI Health Report Translator.")
    c.save()

def make_png(path):
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (1400, 900), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 30)
    except OSError:
        font = ImageFont.load_default()
    lines = ["SAMPLE LAB (synthetic)", "Report Date: 02/10/2026", ""]
    for name, val, unit, ref in ROWS[:10]:
        lines.append(name if val is None else f"{name}   {val}   {unit}   {ref}")
    for i, line in enumerate(lines):
        d.text((60, 40 + i * 62), line, fill="black", font=font)
    img.save(path)

if __name__ == "__main__":
    make_pdf(os.path.join(HERE, "sample-report.pdf"))
    make_png(os.path.join(HERE, "sample-report.png"))
    print("written sample-report.pdf and sample-report.png")
