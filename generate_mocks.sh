#!/usr/bin/env bash
set -e

MOCKS_DIR="$(dirname "$0")/__mocks__"
FIGMA_FILE="HbgJuBVOwIOcoZMVnpG01LqA"

function log() {
  printf "\\n\\033[1m\\033[34m%s\\033[0m\\n\\n" "${1}"
}

function generate_figma() {
  log "=== FIGMA ============================================="
  echo "Generating mocks for Figma"
  node cli.js --dump --exportAssets --token "$FIGMA_TOKEN" "$FIGMA_FILE" --outputDir "$MOCKS_DIR/figma" &&
    mv "$MOCKS_DIR/figma/hubble-data.json" "$MOCKS_DIR/figma/sample_output.json" &&
    mv "$MOCKS_DIR/figma/raw_output.json" "$MOCKS_DIR/figma/sample_dump.json"

  echo "Generating mocks for Figma: Style Dictionary"
  node cli.js --useStyleDictionaryOutput --token "$FIGMA_TOKEN" "$FIGMA_FILE" --outputDir "$MOCKS_DIR/figma" &&
    mv "$MOCKS_DIR/figma/hubble-style-dictionary-tokens.json" "$MOCKS_DIR/figma/sample_output.styledictionary.json"
}

function generate_sketch() {
  log "=== SKETCH ============================================="
  echo "Exporting assets for Sketch"
  ./sketchtool.sh "$MOCKS_DIR/sketch/sample_sketchfile.sketch" __mocks__/sketch/exported_assets

  echo "Generating mocks for Sketch: Document Styles"
  node cli.js --dump --ignoreTextStylePaths "$MOCKS_DIR/sketch/sample_sketchfile.sketch" &&
    mv hubble-data.json "$MOCKS_DIR/sketch/sample_output.document.json" &&
    mv raw_output.json "$MOCKS_DIR/sketch/sample_dump.json"

  echo "Generating mocks for Sketch: Artboard format"
  node cli.js --useColorArtboards --useGradientArtboards --ignoreTextStylePaths "$MOCKS_DIR/sketch/sample_sketchfile.sketch" &&
    mv hubble-data.json "$MOCKS_DIR/sketch/sample_output.artboard.json"

  echo "Generating mocks for Sketch: Style Dictionary"
  node cli.js --useStyleDictionaryOutput --useColorArtboards --useGradientArtboards --ignoreTextStylePaths "$MOCKS_DIR/sketch/sample_sketchfile.sketch" &&
    mv hubble-style-dictionary-tokens.json "$MOCKS_DIR/sketch/sample_output.styledictionary.json"
}

function generate_adobexd() {
  log "=== ADOBEXD ============================================="
  echo "Generating mocks for Adobe XD"
  node cli.js --dump "$MOCKS_DIR/adobexd/sample_adobexd_lib.xd" --outputDir "$MOCKS_DIR/adobexd" &&
    mv "$MOCKS_DIR/adobexd/hubble-data.json" "$MOCKS_DIR/adobexd/sample_output.json" &&
    mv "$MOCKS_DIR/adobexd/raw_output.json" "$MOCKS_DIR/adobexd/sample_dump.json"

  echo "Generating mocks for Adobe XD: Style Dictionary"
  node cli.js --useStyleDictionaryOutput "$MOCKS_DIR/adobexd/sample_adobexd_lib.xd" --outputDir "$MOCKS_DIR/adobexd" &&
    mv "$MOCKS_DIR/adobexd/hubble-style-dictionary-tokens.json" "$MOCKS_DIR/adobexd/sample_output.styledictionary.json"
}

function main() {
  local arr=("sketch" "figma" "adobexd")

  for item in "${arr[@]}"; do
    if [ ! -d "$MOCKS_DIR/$item" ]; then
      mkdir -p "$MOCKS_DIR/$item"
    fi

    # Will evaluate as calling: generate_sketch, generate_figma...
    "generate_$item"
  done
}

main
