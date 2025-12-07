#!/bin/bash
# 남은 파일들의 isPublic 사용 패턴 분석

echo "=== Backend Files ==="
for file in /home/chan/projects/ododocs/server/src/modules/files/*.ts /home/chan/projects/ododocs/server/src/routes/*.ts; do
  if [ -f "$file" ] && grep -q "isPublic" "$file" 2>/dev/null; then
    echo "File: $file"
    grep -n "isPublic" "$file" | head -5
    echo "---"
  fi
done

echo ""
echo "=== Frontend Files ==="
for file in $(find /home/chan/projects/ododocs/src -name "*.tsx" -exec grep -l "isPublic" {} \; 2>/dev/null); do
  echo "File: $file"
  grep -n "isPublic" "$file" | head -3
  echo "---"
done
