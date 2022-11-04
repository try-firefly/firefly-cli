#!/bin/bash

cd ../firefly-lambda-layer || exit

zip -r firefly-layer.zip ./ -x "*.git*" -x "*.gitignore" -x "*build.sh" -x "*README.md"

mv firefly-layer.zip ../bin/firefly-layer.zip
