#!/bin/zsh -f
# Terminal demo for scripts/capture-screenshots.mjs: real git colors, test badges, the
# ANSI ramp, text styles, 256 colors, and truecolor.
# usage: screenshot-demo.zsh <fixture-repo> [short]   (short fits an editor terminal panel)
cd "$1" || exit 1
export GIT_PAGER=cat PAGER=cat
short=${2:-}
e=$'\e'
p() { print -rn -- "${e}[33m~/gas-plasma${e}[0m ${e}[35mmain${e}[0m ${e}[1m\$${e}[0m "; [[ -n "$1" ]] && print -r -- "$1"; }
clear
p "git status --short"
git -c color.status=always status --short
if [[ -z $short ]]; then
p "git diff --stat"
git -c color.ui=always diff --stat HEAD
fi
p "npm test"
print -r -- "${e}[1;7;32m PASS ${e}[0m palette contrast   ${e}[32m12 passed${e}[0m"
print -r -- "${e}[1;7;33m SKIP ${e}[0m zed snapshot       ${e}[33m1 skipped${e}[0m"
print -r -- "${e}[1;7;31m FAIL ${e}[0m icon coverage      ${e}[31m1 failed${e}[0m"
[[ -z $short ]] && p "palette"
for row in 30 90; do
  line=""
  for i in {0..7}; do line+="${e}[$((row+i+10))m       ${e}[0m "; done
  print -r -- "$line"
done
names="black   red     green   yellow  blue    magenta cyan    white"
print -r -- "${e}[2m$names${e}[0m"
[[ -z $short ]] && print -r -- "${e}[1mbold${e}[0m ${e}[2mdim${e}[0m ${e}[3mitalic${e}[0m ${e}[4munderline${e}[0m ${e}[7mreverse${e}[0m ${e}[9mstrike${e}[0m ${e}[1;31mbold red${e}[0m ${e}[1;32mbold green${e}[0m"
if [[ -z $short ]]; then
line=""; for i in {16..51}; do line+="${e}[48;5;${i}m  "; done; print -r -- "$line${e}[0m"
line=""; for i in {232..255}; do line+="${e}[48;5;${i}m   "; done; print -r -- "$line${e}[0m"
line=""; for i in {0..71}; do r=$((i*7/2)); g=$((60 + i)); b=$((255 - i*7/2)); line+="${e}[48;2;${r};${g};${b}m "; done; print -r -- "$line${e}[0m"
fi
p ""
read -s -k 1
