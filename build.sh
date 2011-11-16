#!/bin/bash

# Build the src directory
rm -rf build && \
cp -r src build

# Delete the DS_Store files
find . -name *.DS_Store -type f -exec rm {} \;

# Compress src into xpi
cd build && \
zip -r pcookie.xpi -xi * && \
rm -rf chrome && \
rm -rf chrome.manifest && \
rm -rf install.rdf

echo "Complete, file is in build directory"
