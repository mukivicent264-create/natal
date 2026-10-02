import re

with open('src/servicesData.ts', 'r') as f:
    content = f.read()

content = content.replace("    ]\n  'plumbing-hvac': {", "    ]\n  },\n  'plumbing-hvac': {")

with open('src/servicesData.ts', 'w') as f:
    f.write(content)
