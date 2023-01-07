#!/bin/bash
jq -cr '.features[] | .properties.label, .' maidenhead_level1.json | awk 'NR%2{f="grid/"$0".json";next} {print >f;close(f)}'

PRE=$(cat <<-END
    {
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" }
  },
  "features": [
END

)

POST=$(cat <<-END
    ]
}
END

)

for filename in grid/*.json; do
    [ -e "$filename" ] || continue
    printf '%s\n%s\n%s\n' "$PRE" "$(cat $filename)" "$POST" >$filename

done