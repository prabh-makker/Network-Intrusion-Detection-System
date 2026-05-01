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

def set_font(paragraph, size, bold=False, color_hex="FFFFFF", font_name="Segoe UI"):
    paragraph.font.name = font_name
    paragraph.font.size = Pt(size)
    paragraph.font.bold = bold
    paragraph.font.color.rgb = hex_to_rgb(color_hex)

def add_title(slide, text):
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.2), Inches(9), Inches(1))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = text
    set_font(p, 36, bold=True, color_hex="38BDF8")
    p.alignment = PP_ALIGN.LEFT
    return txBox

def add_card(slide, title, content, left, top, width, height, color_hex="1E293B", font_color="FFFFFF", icon="", title_size=18, content_size=13):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb(color_hex)
    shape.line.color.rgb = hex_to_rgb("334155")
    shape.line.width = Pt(1.5)
    
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_top = Pt(10)
    tf.margin_left = Pt(15)
    tf.margin_right = Pt(15)
    
    # Title
    p = tf.paragraphs[0]
    p.text = f"{icon} {title}" if icon else title
    set_font(p, title_size, bold=True, color_hex=font_color)
    p.alignment = PP_ALIGN.LEFT
    
    # Content
    if content:
        p2 = tf.add_paragraph()
        p2.text = content
        set_font(p2, content_size, color_hex="CBD5E1")
        p2.space_before = Pt(6)
        p2.alignment = PP_ALIGN.LEFT
        p2.line_spacing = 1.1
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
    
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1), Inches(1.5), Inches(8), Inches(4.5))
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb("1E293B")
    shape.line.color.rgb = hex_to_rgb("38BDF8")
    shape.line.width = Pt(3)
    
    tf = shape.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    
    p = tf.paragraphs[0]
    p.text = "🛡️ NIDS Sentinel"
    set_font(p, 54, bold=True, color_hex="38BDF8")
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf.add_paragraph()
    p2.text = "AI-Powered Real-Time Network Intrusion Detection & Threat Analysis"
    set_font(p2, 22, color_hex="94A3B8")
    p2.space_before = Pt(20)
    p2.alignment = PP_ALIGN.CENTER

    p3 = tf.add_paragraph()
    p3.text = "Presented by: Prabhsimran"
    set_font(p3, 24, bold=True, color_hex="FFFFFF")
    p3.space_before = Pt(40)
    p3.alignment = PP_ALIGN.CENTER

    p4 = tf.add_paragraph()
    p4.text = "Roll No: 2410987101"
    set_font(p4, 20, bold=True, color_hex="F59E0B")
    p4.space_before = Pt(10)
    p4.alignment = PP_ALIGN.CENTER

    # SLIDE 2: INTRODUCTION
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "1. What is NIDS Sentinel?")
    
    add_card(slide, "The Core Mission", "NIDS Sentinel is a state-of-the-art Network Intrusion Detection System built to passively monitor network traffic in real-time. It acts as a digital watchtower, scrutinizing every incoming packet for malicious signatures or anomalous behaviors without introducing latency.", Inches(0.5), Inches(1.3), Inches(9), Inches(1.6), "1E293B", "38BDF8", "🎯")
    add_card(slide, "Intelligence Layer", "Unlike traditional rule-based firewalls, Sentinel leverages advanced Machine Learning (Random Forest) to eliminate false positives and detect zero-day anomalies by analyzing subtle pattern variations in network behavior.", Inches(0.5), Inches(3.1), Inches(9), Inches(1.6), "1E293B", "A855F7", "🧠")
    add_card(slide, "Actionable Security", "It provides an immersive Glassmorphic dashboard that gives security analysts real-time visibility, automated mitigation strategies, and critical insights into the organization's network health.", Inches(0.5), Inches(4.9), Inches(9), Inches(1.6), "1E293B", "22C55E", "🛡️")

    # SLIDE 3: KEY FEATURES
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "2. Key Features")
    
    add_card(slide, "Real-Time Sniffing", "Utilizes Python's Scapy library to perform deep packet inspection (DPI). Captures raw TCP/UDP/ICMP packets seamlessly with sub-millisecond precision.", Inches(0.5), Inches(1.3), Inches(4.3), Inches(2.8), "1E293B", "F59E0B", "⚡")
    add_card(slide, "AI Classification", "Employs an optimized Random Forest classifier achieving 99.82% accuracy. Capable of classifying Normal, DoS, DDoS, Probe, and U2R attacks.", Inches(5.2), Inches(1.3), Inches(4.3), Inches(2.8), "1E293B", "EC4899", "🤖")
    add_card(slide, "Live Dashboard", "Built on Next.js 16, featuring real-time dynamic Recharts that visualize traffic volume, attack frequency, and protocols instantaneously.", Inches(0.5), Inches(4.3), Inches(4.3), Inches(2.8), "1E293B", "06B6D4", "📊")
    add_card(slide, "Explainable AI Alerts", "Bridges the gap between AI and humans. Provides exact reasoning (e.g., 'Unusual byte count') for why a specific packet was flagged.", Inches(5.2), Inches(4.3), Inches(4.3), Inches(2.8), "1E293B", "EF4444", "🚨")

    # SLIDE 4: SYSTEM ARCHITECTURE
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "3. System Architecture Data Flow")
    
    box_w = Inches(2.6)
    box_h = Inches(1.0)
    center_x = Inches(3.7)
    
    y1 = Inches(1.2)
    a1_y = y1 + box_h
    y2 = a1_y + Inches(0.25)
    a2_y = y2 + box_h
    y3 = a2_y + Inches(0.25)
    a3_y = y3 + box_h
    y4 = a3_y + Inches(0.25)
    y5 = y4 + box_h + Inches(0.4)

    add_card(slide, "🌐 Network Traffic", "Raw TCP/UDP Packets", center_x, y1, box_w, box_h, "2563EB", "FFFFFF", title_size=15, content_size=12)
    add_flow_arrow(slide, center_x + Inches(1.15), a1_y, Inches(0.3), Inches(0.25))
    
    add_card(slide, "🔍 Scapy Sniffer", "Packet Capture & Parsing", center_x, y2, box_w, box_h, "7C3AED", "FFFFFF", title_size=15, content_size=12)
    add_flow_arrow(slide, center_x + Inches(1.15), a2_y, Inches(0.3), Inches(0.25))
    
    add_card(slide, "🧠 ML Engine", "Random Forest Inference", center_x, y3, box_w, box_h, "DB2777", "FFFFFF", title_size=15, content_size=12)
    add_flow_arrow(slide, center_x + Inches(1.15), a3_y, Inches(0.3), Inches(0.25))
    
    add_card(slide, "⚙️ FastAPI Backend", "Data Processing & Sockets", center_x, y4, box_w, box_h, "059669", "FFFFFF", title_size=15, content_size=12)
    
    # DB and UI laterally
    add_card(slide, "🗄️ Database", "SQLite / PostgreSQL", Inches(1.0), y5, Inches(2.2), box_h, "D97706", "FFFFFF", title_size=15, content_size=12)
    add_card(slide, "📊 Next.js UI", "Live Dashboard View", Inches(6.8), y5, Inches(2.2), box_h, "D97706", "FFFFFF", title_size=15, content_size=12)
    
    # Arrows from Backend to DB/UI
    add_flow_arrow(slide, Inches(3.2), y4 + box_h - Inches(0.1), Inches(0.2), Inches(0.4), 45)
    add_flow_arrow(slide, Inches(6.6), y4 + box_h - Inches(0.1), Inches(0.2), Inches(0.4), -45)
    
    # Alert Box
    add_card(slide, "🚨 Threat Alerts", "Immediate Action", Inches(6.8), y3, Inches(2.0), box_h, "DC2626", "FFFFFF", title_size=15, content_size=12)
    
    # Arrow from ML to Alert
    shape = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, center_x + box_w + Inches(0.1), y3 + box_h/2 - Inches(0.1), Inches(0.4), Inches(0.2))
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb("64748B")

    # SLIDE 5: TECHNOLOGY STACK
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "4. Technology Stack")
    
    add_card(slide, "Frontend Technologies", "Next.js 16 (React framework), TypeScript for type-safety, Tailwind CSS for utility-first styling, Recharts for dynamic SVG charts, and Framer Motion for smooth UI transitions.", Inches(0.5), Inches(1.3), Inches(9), Inches(1.3), "0F172A", "38BDF8", "🖥️")
    add_card(slide, "Backend Architecture", "FastAPI for highly performant asynchronous API endpoints, SQLAlchemy as the reliable ORM, and WebSockets for bidirectional real-time data streaming.", Inches(0.5), Inches(2.8), Inches(9), Inches(1.3), "0F172A", "A855F7", "⚙️")
    add_card(slide, "Machine Learning Stack", "Scikit-learn for model training (Random Forest), Pandas for data manipulation, and Joblib for extremely fast model serialization and inference.", Inches(0.5), Inches(4.3), Inches(9), Inches(1.3), "0F172A", "22C55E", "🧠")
    add_card(slide, "Networking & Database", "Scapy and PyPcap for low-level network packet capture. SQLite configuration for structured threat storage, fully scalable to PostgreSQL.", Inches(0.5), Inches(5.8), Inches(9), Inches(1.3), "0F172A", "F59E0B", "🗄️")

    # SLIDE 6: MACHINE LEARNING DETAILS
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "5. ML Model Insights")
    
    add_card(slide, "Algorithm Choice", "Random Forest Classifier was selected due to its robust resistance to overfitting and excellent performance on high-dimensional tabular network data. It handles non-linear relationships effectively.", Inches(0.5), Inches(1.3), Inches(4.3), Inches(2.6), "1E293B", "38BDF8", "⚙️")
    add_card(slide, "Dataset & Training", "Trained and validated on synthetic NSL-KDD datasets encompassing over 25,000 real-world attack vectors and normal traffic patterns to ensure diverse threat coverage.", Inches(5.2), Inches(1.3), Inches(4.3), Inches(2.6), "1E293B", "F59E0B", "📊")
    
    shape = add_card(slide, "Model Performance & Metrics", "", Inches(0.5), Inches(4.1), Inches(9), Inches(2.8), "1E293B", "22C55E", "📈")
    tf = shape.text_frame
    p = tf.add_paragraph()
    p.text = "• Accuracy: 99.82%  |  Precision: 99.7%  |  Recall: 99.8%\n• Feature Extraction: 12 critical vectors including Protocol, TCP flags, byte counts, and connection error rates.\n• Inference Latency: Sub-10ms per packet, ensuring zero bottleneck in network flow."
    set_font(p, 15, color_hex="CBD5E1")
    p.space_before = Pt(10)
    p.line_spacing = 1.3

    # SLIDE 7: THREAT DETECTION WORKFLOW
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "6. Threat Detection in Action")
    
    add_card(slide, "Step 1: Continuous Monitoring", "The backend continuously ingests packets, extracts the 12 features, and runs inference. The dashboard listens via WebSockets for instantaneous updates.", Inches(0.5), Inches(1.3), Inches(9), Inches(1.3), "1E293B", "F43F5E", "1️⃣")
    add_card(slide, "Step 2: Automated Alerting", "When an anomaly is detected, it is immediately logged into the database and pushed to the UI with a severity score (Low, Medium, High, Critical).", Inches(0.5), Inches(2.8), Inches(9), Inches(1.3), "1E293B", "F59E0B", "2️⃣")
    add_card(slide, "Step 3: Explainable AI", "Security analysts can click on any alert to see the AI's rationale, such as identifying a sudden spike in SYN flags indicative of a SYN Flood attack.", Inches(0.5), Inches(4.3), Inches(9), Inches(1.3), "1E293B", "10B981", "3️⃣")
    add_card(slide, "Step 4: Actionable Insights", "The system provides immediate mitigation recommendations and allows analysts to block malicious IPs dynamically.", Inches(0.5), Inches(5.8), Inches(9), Inches(1.3), "1E293B", "3B82F6", "4️⃣")

    # SLIDE 8: THE DASHBOARD EXPERIENCE
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "7. The Dashboard UI Experience")
    
    add_card(slide, "Glassmorphism Aesthetics", "Employs modern frosted glass effects and semi-transparent layers to provide a premium, uncluttered, and highly readable view of complex security data.", Inches(0.5), Inches(1.3), Inches(4.3), Inches(2.8), "1E293B", "0EA5E9", "✨")
    add_card(slide, "Dynamic Visualizations", "Integrates Recharts for fluid, live-updating line and bar charts. It maps traffic volume per second, protocol breakdowns, and historical threat trends.", Inches(5.2), Inches(1.3), Inches(4.3), Inches(2.8), "1E293B", "10B981", "📈")
    add_card(slide, "Responsive & Adaptive Theming", "Features a fully responsive design with native CSS variable theming, seamlessly switching between 'Deep Dark' and 'Clinical Light' modes for optimal visibility.", Inches(0.5), Inches(4.3), Inches(9), Inches(1.6), "1E293B", "F59E0B", "🌗")

    # SLIDE 9: FUTURE ENHANCEMENTS
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    add_title(slide, "8. Future Enhancements")
    
    add_card(slide, "Active Prevention (IPS)", "Evolving the system from purely passive detection (IDS) to an active Intrusion Prevention System (IPS) capable of modifying firewall rules autonomously.", Inches(0.5), Inches(1.3), Inches(4.3), Inches(2.8), "1E293B", "EC4899", "🚧")
    add_card(slide, "Deep Learning Models", "Upgrading the inference engine with Long Short-Term Memory (LSTM) networks to detect highly complex, temporal, and multi-stage attack patterns.", Inches(5.2), Inches(1.3), Inches(4.3), Inches(2.8), "1E293B", "8B5CF6", "🧠")
    add_card(slide, "Cloud & Enterprise Scale", "Deploying distributed sensor networks via Docker/Kubernetes and integrating with major SIEM tools (Splunk, ELK) for enterprise-grade deployments.", Inches(0.5), Inches(4.3), Inches(9), Inches(1.6), "1E293B", "38BDF8", "☁️")

    # SLIDE 10: CONCLUSION & Q&A
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_theme(slide)
    
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1), Inches(1.5), Inches(8), Inches(4.5))
    shape.fill.solid()
    shape.fill.fore_color.rgb = hex_to_rgb("0F172A") 
    shape.line.color.rgb = hex_to_rgb("10B981")
    shape.line.width = Pt(3)
    
    tf = shape.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    
    p = tf.paragraphs[0]
    p.text = "Conclusion"
    set_font(p, 48, bold=True, color_hex="10B981")
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf.add_paragraph()
    p2.text = "NIDS Sentinel empowers organizations to defend against evolving cyber threats proactively with Explainable AI and Real-time data visualization."
    set_font(p2, 18, color_hex="E2E8F0")
    p2.space_before = Pt(20)
    p2.alignment = PP_ALIGN.CENTER
    
    p3 = tf.add_paragraph()
    p3.text = "Questions?"
    set_font(p3, 36, bold=True, color_hex="38BDF8")
    p3.space_before = Pt(30)
    p3.alignment = PP_ALIGN.CENTER

    p4 = tf.add_paragraph()
    p4.text = "Prabhsimran  |  Roll No: 2410987101"
    set_font(p4, 16, bold=True, color_hex="F59E0B")
    p4.space_before = Pt(30)
    p4.alignment = PP_ALIGN.CENTER

    prs.save('NIDS_Detailed_Presentation_v2.pptx')
    print("Successfully created NIDS_Detailed_Presentation_v2.pptx")

if __name__ == '__main__':
    create_presentation()
