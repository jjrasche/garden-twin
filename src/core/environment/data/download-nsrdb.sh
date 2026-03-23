#!/bin/bash
# Download NSRDB hourly GHI for Grand Rapids (42.96, -85.67) for 2015-2023
# GOES v4 API, requires NREL API key

API_KEY="LjBYOHR3SBMGsQh4PubFxjuJMY84TAZWYPvhHp4o"
LAT="42.96"
LON="-85.67"
EMAIL="rasche_j@outlook.com"
OUTDIR="$(dirname "$0")/nsrdb"
mkdir -p "$OUTDIR"

for YEAR in 2015 2016 2017 2018 2019 2020 2021 2022 2023; do
  echo "Downloading $YEAR..."
  curl -s -L -o "$OUTDIR/ghi_${YEAR}.csv" \
    "https://developer.nlr.gov/api/nsrdb/v2/solar/nsrdb-GOES-aggregated-v4-0-0-download.csv?api_key=${API_KEY}&wkt=POINT(${LON}%20${LAT})&names=${YEAR}&interval=60&attributes=ghi&utc=false&email=${EMAIL}"
  sleep 2  # Rate limit: 1 req/2 sec
  echo "  $(wc -l < "$OUTDIR/ghi_${YEAR}.csv") lines"
done

echo "Done. Files in $OUTDIR/"
