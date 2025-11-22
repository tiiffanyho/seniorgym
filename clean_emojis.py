#!/usr/bin/env python3
import re

# Read the file
with open('my-react-router-app/app/features/pose-coach.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all emojis using comprehensive regex
emoji_pattern = re.compile("["
    u"\U0001F600-\U0001F64F"  # emoticons
    u"\U0001F300-\U0001F5FF"  # symbols & pictographs
    u"\U0001F680-\U0001F6FF"  # transport & map symbols
    u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
    u"\U00002702-\U000027B0"
    u"\U000024C2-\U0001F251"
    u"\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    u"\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    u"\u2600-\u26FF"  # Miscellaneous Symbols
    u"\u2700-\u27BF"  # Dingbats
    u"\uFE00-\uFE0F"  # Variation Selectors
    u"\u200d"  # Zero Width Joiner
    "]+", flags=re.UNICODE)

# Remove emojis but keep the spaces
content = emoji_pattern.sub('', content)

# Fix double spaces that might result
content = re.sub(r'  +', ' ', content)

# Write back
with open('my-react-router-app/app/features/pose-coach.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Emojis removed successfully!")
