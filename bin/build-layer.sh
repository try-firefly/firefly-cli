#!/bin/bash

cd ../firefly-lambda-layer || exit

zip -r firefly-layer.zip ./

mv firefly-layer.zip ../bin/firefly-layer.zip
