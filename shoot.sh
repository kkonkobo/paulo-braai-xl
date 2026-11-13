#!/bin/sh
# usage: shoot.sh <view> <finish> <out.png> [extra query]
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1500,900 --virtual-time-budget=6000 --screenshot="$3" \
  "file://$PWD/docs/index.html?view=$1&finish=$2$4" 2>/dev/null
