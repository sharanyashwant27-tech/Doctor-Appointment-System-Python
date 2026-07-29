#!/bin/sh
set -e
python -m database.seed || true
exec "$@"
