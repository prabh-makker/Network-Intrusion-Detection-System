from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import io
from datetime import datetime

def generate_threat_pdf(alerts_data: list, total_threats: int):
    # Create the in-memory PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = styles['Title']
    heading_style = styles['Heading2']
    normal_style = styles['Normal']
    
    # Custom colored style
    critical_style = ParagraphStyle(
        'Critical',
        parent=normal_style,
        textColor=colors.red,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph(f"NIDS Sentinel - Threat Intelligence Report", title_style))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph(f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", normal_style))
    elements.append(Paragraph(f"Total Threats Logged: {total_threats}", normal_style))
    elements.append(Spacer(1, 24))
    
    # Description
    elements.append(Paragraph("This document contains a summary of the most recently detected network intrusions, AI predictions, and automated actions taken by the NIDS Sentinel engine.", normal_style))
    elements.append(Spacer(1, 24))
    
    # Table Header setup
    elements.append(Paragraph("Recent Critical Alerts Table", heading_style))
    elements.append(Spacer(1, 12))
    
    table_data = [["Timestamp", "Source IP", "Target IP", "Protocol", "Classification", "AI Confidence"]]
    
    # Populate data rows
    for alert in alerts_data[:30]:  # Limit to top 30 for the PDF
        ts = alert.timestamp.strftime('%Y-%m-%d %H:%M:%S') if hasattr(alert, "timestamp") else alert.get('timestamp', "N/A")
        
        # Safely extract properties whether it's an ORM object or a Dict
        src = getattr(alert, "src_ip", None) or alert.get("src_ip", "N/A")
        dst = getattr(alert, "dst_ip", None) or alert.get("dst_ip", "N/A")
        proto = getattr(alert, "protocol", None) or alert.get("protocol", "N/A")
        label = getattr(alert, "label", None) or alert.get("label", "N/A")
        conf = getattr(alert, "confidence", None) or alert.get("confidence", 0.0)
        
        table_data.append([
            ts, 
            src, 
            dst, 
            proto, 
            label, 
            f"{conf:.2f}%"
        ])
        
    # Table styling (sleek dark/light borders)
    t = Table(table_data, colWidths=[100, 80, 80, 50, 140, 70])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#334155')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0'))
    ]))
    
    elements.append(t)
    
    # Build
    doc.build(elements)
    buffer.seek(0)
    return buffer
