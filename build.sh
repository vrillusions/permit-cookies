#!/bin/bash

# Build the src directory
rm -rf build && \
cp -r src build

# Delete the DS_Store files
find . -name *.DS_Store -type f -exec rm {} \;

# Compress pcookie.jar file
cd build/chrome && \
zip -r pcookie.jar pcookie/* && \
rm -rf pcookie

#Compress whole project
cd ../../build && \
rm -rf chrome/.DS_Store && \
zip -r pcookie.xpi -xi * && \
rm -rf chrome && \
rm -rf chrome.manifest && \
rm -rf install.rdf

echo "Complete, file is in build directory"
