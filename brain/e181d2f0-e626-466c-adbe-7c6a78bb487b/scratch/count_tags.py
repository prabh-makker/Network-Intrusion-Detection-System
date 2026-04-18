
with open(r'c:\Users\khalo\prabh\Network-Intrusion-Detection-System\frontend\src\app\dashboard\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

div_open = content.count('<div')
div_close = content.count('</div')
motion_open = content.count('<motion.div')
motion_close = content.count('</motion.div')

print(f"div: {div_open} open, {div_close} close")
print(f"motion.div: {motion_open} open, {motion_close} close")
