#!/usr/bin/env bash
# Assemble the site from each story's source folder. The copies in this repo are
# build output, so edit the sources and rerun this, never the copies.
#   bash tools/build.sh           copy all three stories and refresh the card images
# The Ten Thousand Windows card is rendered with headless Chrome, so its dev server must be
# running on 8791. The Finite Time card is a frame from its finished video in Downloads.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; site="$(dirname "$here")"
ttw=$HOME/AIS-OS/content/youtube/drafts/ten-thousand-windows
ft=$HOME/AIS-OS/content/youtube/drafts/finite-time/publish
hoh="$HOME/Downloads/Hand Over Hand"

# Ten Thousand Windows: the web folder, without the dev page
rm -rf "$site/ten-thousand-windows"; mkdir -p "$site/ten-thousand-windows"
( cd "$ttw/web" && cp index.html engine.js cast.js story.js sources.js score.js voices.js scene-*.js "$site/ten-thousand-windows/" && cp -r v "$site/ten-thousand-windows/v" )
rm -f "$site/ten-thousand-windows/v/manifest.json"

# Finite Time: the published player and its soundtrack
rm -rf "$site/finite-time"; mkdir -p "$site/finite-time"
( cd "$ft" && cp index.html engine.js film-core.js film-eval.js film-fable.js film-family.js timeline.js finite-time.mp3 "$site/finite-time/" )

# Hand Over Hand: one page and its song
rm -rf "$site/hand-over-hand"; mkdir -p "$site/hand-over-hand"
cp "$hoh/index.html" "$hoh/hand-over-hand.mp3" "$site/hand-over-hand/"

# card images, 1200 by 675
mkdir -p "$site/img"
bash "$ttw/tools/shoot.sh" "shot=city.windows&t=14&p=%7B%22push%22%3Atrue%7D" card-ttw >/dev/null
ffmpeg -y -loglevel error -i "$ttw/tools/frames/card-ttw.jpg" -vf scale=1200:675 -q:v 3 "$site/img/ten-thousand-windows.jpg"
# Finite Time: a frame from the finished video, the third door opening onto the river
ffmpeg -y -loglevel error -ss 300 -i $HOME/Downloads/finite-time-720p.mp4 -frames:v 1 -vf scale=1200:675 -q:v 3 "$site/img/finite-time.jpg"
ffmpeg -y -loglevel error -i "$HOME/Downloads/thumb-B-what-will-she-be.jpg" -vf "crop=960:540:160:170,scale=1200:675" -q:v 3 "$site/img/hand-over-hand.jpg"

du -sh "$site/ten-thousand-windows" "$site/finite-time" "$site/hand-over-hand" "$site/img"
