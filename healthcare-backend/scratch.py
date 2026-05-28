import re
with open('app/seed.py', 'r', encoding='utf-8') as f:
    c = f.read()
c = re.sub(r',"', ', "', c)
with open('app/seed.py', 'w', encoding='utf-8') as f:
    f.write(c)
