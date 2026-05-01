from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.dml.color import RGBColor

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return RGBColor(int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16))

def apply_dark_theme(slide):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = hex_to_rgb("0F172A") # Slate 900

def add_title(slide, text):
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.2), Inches(9), Inches(1))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = hex_to_rgb("38BDF8") # Light blue
    p.alignment = PP_ALIGN.LEFT
    return txBox

def add_card(slide, title, content, left, top, width, height, color_hex="1E293B", font_color="FFFFFF", icon=""):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb(color_hex)
    shape.line.color.rgb = hex_to_rgb("334155")
    shape.line.width = Pt(1.5)
    
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_top = Pt(15)
    tf.margin_left = Pt(15)
    tf.margin_right = Pt(15)
    
    # Title
    p = tf.paragraphs[0]
    p.text = f"{icon} {title}" if icon else title
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = hex_to_rgb(font_color)
    p.alignment = PP_ALIGN.LEFT
    
    # Content
    if content:
        p2 = tf.add_paragraph()
        p2.text = content
        p2.font.size = Pt(14)
        p2.font.color.rgb = hex_to_rgb("CBD5E1")
        p2.space_before = Pt(10)
        p2.alignment = PP_ALIGN.LEFT
    return shape

def add_flow_arrow(slide, left, top, width, height, rotation=0):
    shape = slide.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, left, top, width, height)
    shape.rotation = rotation
    fill = shape.fill
    fill.solid()
    fill.fore_color.rgb = hex_to_rgb("64748B")
    line = shape.line
    line.color.rgb = hex_to_rgb("0F172A")
    line.width = Pt(1)
    return shape

def create_presentation():
    prs = Presentation()
    
    # SLIDE 1: TITLE SLIDE
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1), Inches(2), Inches(8), Inches(3.5))
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb("1E293B")
    shape.line.color.rgb = hex_to_rgb("38BDF8")
    shape.line.width = Pt(3)
    
    tf = shape.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "🛡️ NIDS Sentinel"
    p.font.size = Pt(54)
    p.font.bold = True
    p.font.color.rgb = hex_to_rgb("38BDF8")
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf.add_paragraph()
    p2.text = "AI-Powered Real-Time Network Intrusion Detection & Threat Analysis"
    p2.font.size = Pt(24)
    p2.font.color.rgb = hex_to_rgb("94A3B8")
    p2.space_before = Pt(20)
    p2.alignment = PP_ALIGN.CENTER

    # SLIDE 2: INTRODUCTION
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "1. What is NIDS Sentinel?")
    
    add_card(slide, "The Core Mission", "A robust Network Intrusion Detection System designed to monitor network traffic for malicious activity with zero latency.", Inches(0.5), Inches(1.5), Inches(9), Inches(1.5), "1E293B", "38BDF8", "🎯")
    add_card(slide, "Intelligence Layer", "Leverages advanced Artificial Intelligence and Machine Learning algorithms (Random Forest) to eliminate false positives.", Inches(0.5), Inches(3.2), Inches(9), Inches(1.5), "1E293B", "A855F7", "🧠")
    add_card(slide, "Actionable Security", "Provides real-time visibility into network health and security threats with an immersive Glassmorphic dashboard.", Inches(0.5), Inches(4.9), Inches(9), Inches(1.5), "1E293B", "22C55E", "🛡️")

    # SLIDE 3: KEY FEATURES
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "2. Key Features")
    
    # 2x2 Grid
    add_card(slide, "Real-Time Sniffing", "Live traffic analysis using Scapy at the packet level.", Inches(0.5), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "F59E0B", "⚡")
    add_card(slide, "AI Classification", "Detects DoS, DDoS, Probe, and U2R attacks with 99.8% accuracy.", Inches(5.2), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "EC4899", "🤖")
    add_card(slide, "Live Dashboard", "Interactive React-based dashboard with real-time charts.", Inches(0.5), Inches(4.2), Inches(4.3), Inches(2.5), "1E293B", "06B6D4", "📊")
    add_card(slide, "Explainable AI Alerts", "Understand exactly which features triggered the alert.", Inches(5.2), Inches(4.2), Inches(4.3), Inches(2.5), "1E293B", "EF4444", "🚨")

    # SLIDE 4: SYSTEM ARCHITECTURE (The Flowchart)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "3. System Architecture Data Flow")
    
    box_w = Inches(2.5)
    box_h = Inches(0.8)
    center_x = Inches(3.75) 
    
    # Nodes
    add_card(slide, "🌐 Network Traffic", "", center_x, Inches(1.2), box_w, box_h, "2563EB", "FFFFFF")
    add_flow_arrow(slide, center_x + Inches(1.1), Inches(2.0), Inches(0.3), Inches(0.3))
    add_card(slide, "🔍 Scapy Sniffer", "", center_x, Inches(2.3), box_w, box_h, "7C3AED", "FFFFFF")
    add_flow_arrow(slide, center_x + Inches(1.1), Inches(3.1), Inches(0.3), Inches(0.3))
    add_card(slide, "🧠 ML Engine", "", center_x, Inches(3.4), box_w, box_h, "DB2777", "FFFFFF")
    add_flow_arrow(slide, center_x + Inches(1.1), Inches(4.2), Inches(0.3), Inches(0.3))
    add_card(slide, "⚙️ FastAPI Backend", "", center_x, Inches(4.5), box_w, box_h, "059669", "FFFFFF")
    
    # DB and UI
    add_card(slide, "🗄️ Database", "", Inches(1.0), Inches(5.8), Inches(2.2), box_h, "D97706", "FFFFFF")
    add_card(slide, "📊 Next.js UI", "", Inches(6.8), Inches(5.8), Inches(2.2), box_h, "D97706", "FFFFFF")
    
    add_flow_arrow(slide, Inches(3.2), Inches(5.3), Inches(0.2), Inches(0.4), 45)
    add_flow_arrow(slide, Inches(6.6), Inches(5.3), Inches(0.2), Inches(0.4), -45)
    
    # Alerts Box
    add_card(slide, "🚨 Alerts", "", Inches(7.0), Inches(3.4), Inches(2.0), box_h, "DC2626", "FFFFFF")
    shape = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(6.3), Inches(3.7), Inches(0.6), Inches(0.2))
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb("64748B")

    # SLIDE 5: TECHNOLOGY STACK
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "4. Technology Stack")
    
    add_card(slide, "Frontend", "Next.js 16, React, TypeScript, Tailwind CSS, Recharts", Inches(0.5), Inches(1.5), Inches(9), Inches(1.2), "0F172A", "38BDF8", "🖥️")
    add_card(slide, "Backend", "FastAPI (Python), SQLAlchemy, WebSockets", Inches(0.5), Inches(2.9), Inches(9), Inches(1.2), "0F172A", "A855F7", "⚙️")
    add_card(slide, "Machine Learning", "Scikit-learn (Random Forest), Pandas, Joblib", Inches(0.5), Inches(4.3), Inches(9), Inches(1.2), "0F172A", "22C55E", "🧠")
    add_card(slide, "Networking / DB", "Scapy, PyPcap, SQLite (PostgreSQL Ready)", Inches(0.5), Inches(5.7), Inches(9), Inches(1.2), "0F172A", "F59E0B", "🗄️")

    # SLIDE 6: MACHINE LEARNING DETAILS
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "5. ML Model Insights")
    
    add_card(slide, "Algorithm", "Random Forest Classifier - Chosen for its robustness against overfitting and high accuracy on tabular network data.", Inches(0.5), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "38BDF8", "⚙️")
    add_card(slide, "Dataset", "Trained on synthetic NSL-KDD datasets (over 25,000+ real-world attack & normal packets).", Inches(5.2), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "F59E0B", "📊")
    
    shape = add_card(slide, "Model Performance", "", Inches(0.5), Inches(4.2), Inches(9), Inches(2.5), "1E293B", "22C55E", "📈")
    tf = shape.text_frame
    p = tf.add_paragraph()
    p.text = "• Accuracy: 99.82%\n• Features: 12 key extracted vectors (Protocol, flags, byte count, error rate)\n• Latency: Sub-10ms inference per packet"
    p.font.size = Pt(16)
    p.font.color.rgb = hex_to_rgb("CBD5E1")
    p.space_before = Pt(10)

    # SLIDE 7: THREAT DETECTION WORKFLOW
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "6. Threat Detection in Action")
    
    add_card(slide, "Step 1: Continuous Monitoring", "Dashboard updates instantly as traffic flows via WebSockets.", Inches(0.5), Inches(1.5), Inches(9), Inches(1.2), "1E293B", "F43F5E", "1️⃣")
    add_card(slide, "Step 2: Automated Alerting", "Critical threats are flagged automatically with severity scoring.", Inches(0.5), Inches(2.9), Inches(9), Inches(1.2), "1E293B", "F59E0B", "2️⃣")
    add_card(slide, "Step 3: Explainable AI", "The system highlights which exact features triggered the alert.", Inches(0.5), Inches(4.3), Inches(9), Inches(1.2), "1E293B", "10B981", "3️⃣")
    add_card(slide, "Step 4: Actionable Insights", "Analysts can view mitigation strategies and block attacker IPs.", Inches(0.5), Inches(5.7), Inches(9), Inches(1.2), "1E293B", "3B82F6", "4️⃣")

    # SLIDE 8: THE DASHBOARD EXPERIENCE
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "7. The Dashboard UI")
    
    add_card(slide, "Glassmorphism Aesthetics", "Modern frosted glass effects providing a premium, uncluttered view of complex data.", Inches(0.5), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "0EA5E9", "✨")
    add_card(slide, "Dynamic Visualizations", "Recharts implementation for live-updating line charts mapping traffic volume and threats.", Inches(5.2), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "10B981", "📈")
    add_card(slide, "Dark/Light Modes", "Fully responsive theming using CSS variables for optimal viewing in any environment.", Inches(0.5), Inches(4.2), Inches(9), Inches(1.5), "1E293B", "F59E0B", "🌗")

    # SLIDE 9: FUTURE ENHANCEMENTS
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "8. Future Enhancements")
    
    add_card(slide, "Active Prevention (IPS)", "Transitioning from Detection to active Intrusion Prevention.", Inches(0.5), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "EC4899", "🚧")
    add_card(slide, "Deep Learning Models", "Implementing LSTMs for complex, time-series attack patterns.", Inches(5.2), Inches(1.5), Inches(4.3), Inches(2.5), "1E293B", "8B5CF6", "🧠")
    add_card(slide, "Cloud & Enterprise Scale", "Distributed sensor networks & SIEM tool integrations.", Inches(0.5), Inches(4.2), Inches(9), Inches(1.5), "1E293B", "38BDF8", "☁️")

    # SLIDE 10: CONCLUSION & Q&A
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1), Inches(2), Inches(8), Inches(3.5))
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb("0F172A") 
    shape.line.color.rgb = hex_to_rgb("10B981")
    shape.line.width = Pt(3)
    
    tf = shape.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "Conclusion"
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = hex_to_rgb("10B981")
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf.add_paragraph()
    p2.text = "NIDS Sentinel empowers organizations to defend against evolving cyber threats proactively with AI and Real-time data."
    p2.font.size = Pt(20)
    p2.font.color.rgb = hex_to_rgb("E2E8F0")
    p2.space_before = Pt(20)
    p2.alignment = PP_ALIGN.CENTER
    
    p3 = tf.add_paragraph()
    p3.text = "Questions?"
    p3.font.size = Pt(32)
    p3.font.color.rgb = hex_to_rgb("38BDF8")
    p3.space_before = Pt(30)
    p3.alignment = PP_ALIGN.CENTER

    prs.save('NIDS_Responsive_10_Slides.pptx')
    print("Successfully created NIDS_Responsive_10_Slides.pptx")

if __name__ == '__main__':
    create_presentation()
