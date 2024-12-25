#!/bin/bash

rm -f map_overlay1.jpg map_overlay2.jpg map_overlay3.jpg
rm -f map_overlay3.mp4 map_overlay4.mp4 map_overlay5.mp4
rm -f xmap_overlay3.mp4 xmap_overlay4.mp4 xmap_overlay5.mp4

# Wait until the browser with the maps is available
echo "Waiting to see Browser open.."
while true; do
    xwininfo -name "Load GPS from Ride Video - Google Chrome" > /dev/null 2>&1 
    if [ $? = 0 ]; then break; fi
    sleep .05
done
echo "Found Browser!"

# Get window position
unset x y w h
eval $(xwininfo -name "Load GPS from Ride Video - Google Chrome" |
    sed -n -e "s/^ \+Absolute upper-left X: \+\([0-9]\+\).*/x=\1/p" \
           -e "s/^ \+Absolute upper-left Y: \+\([0-9]\+\).*/y=\1/p" \
           -e "s/^ \+Width: \+\([0-9]\+\).*/w=\1/p" \
           -e "s/^ \+Height: \+\([0-9]\+\).*/h=\1/p" )
echo "Window position: x=${x} y=${y} w=${w} h=${h}"

# Start ringbell to be notified when the ride simulation start
ncat -l -e "/bin/false" 32001
ffmpeg -re -y -video_size 350x600  -framerate 5 -f x11grab -i :0.0+$((x+18+550+10+550+240)),$((y+139))        -c:v libx264 -preset medium -crf 21 -filter:v fps=25 /tmp/map_overlay3.mp4 -y > /dev/null 2>&1 &
ffmpeg_task3=$!
ffmpeg -re -y -video_size 1350x600 -framerate 5 -f x11grab -i :0.0+$((x+8)),$((y+149+400))                    -c:v libx264 -preset medium -crf 21 -filter:v fps=25 /tmp/map_overlay4.mp4 -y > /dev/null 2>&1 &
ffmpeg_task4=$!
ffmpeg -re -y -video_size 450x600  -framerate 5 -f x11grab -i :0.0+$((x+18+550+10+550+240+10+350)),$((y+139)) -c:v libx264 -preset medium -crf 21 -filter:v fps=25 /tmp/map_overlay5.mp4 -y > /dev/null 2>&1 &
ffmpeg_task5=$!
echo "Recording VIDEO!"
echo $ffmpeg_task3 $ffmpeg_task4 $ffmpeg_task5
#disown $ffmpeg_task3 $ffmpeg_task4 $ffmpeg_task5

# Start ringbell to be notified when the ride simulation ends
ncat -l -e "/bin/false" 32002
sync
echo "Done recording!"
kill -s QUIT $ffmpeg_task3
kill -s QUIT $ffmpeg_task4
kill -s QUIT $ffmpeg_task5
wait $ffmpeg_task3 $ffmpeg_task4 $ffmpeg_task5
mv /tmp/map_overlay3.mp4 map_overlay3.mp4
mv /tmp/map_overlay4.mp4 map_overlay4.mp4
mv /tmp/map_overlay5.mp4 map_overlay5.mp4

# Start ringbell to be notified when the ride simulation start
echo "Recording JPEG!"
ffmpeg -re -y -video_size 550x400 -framerate 1 -f x11grab -i :0.0+$((x+8)),$((y+138)) -vframes 1 map_overlay1.jpg -y > /dev/null 2>&1
ffmpeg_task1=$!
ffmpeg -re -y -video_size 550x400 -framerate 1 -f x11grab -i :0.0+$((x+18+550)),$((y+138)) -vframes 1 map_overlay2.jpg -y > /dev/null 2>&1
ffmpeg_task2=$!
echo $ffmpeg_task1 $ffmpeg_task2
echo $(pidof ffmpeg)
wait $ffmpeg_task1 $ffmpeg_task2
sync
echo "Done with jpegs"

exit 0

##################

# Web Server
python3 -m http.server

# Duration of MP4 file
ffprobe -show_entries format=duration -v quiet -of csv="p=0" -i map_overlay3.mp4

# How many frames in MP4 file
ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 -i map_overlay3.mp4

# Show framerate of MP4 file
ffprobe -v 0 -of csv=p=0 -select_streams v:0 -show_entries stream=r_frame_rate infile

# -----------------

# Create GPX file
exiftool -api largefilesupport=1 -p /home/osingla/GH/RouteView/work/videos/gpx.fmt -ee GX010266.MP4 > ride.gpx

# Reframe gpx mp4 file
https://trac.ffmpeg.org/wiki/How%20to%20speed%20up%20/%20slow%20down%20a%20video
ffmpeg -i map_overlay3.mp4 -filter:v "setpts=5.0*PTS" -vsync 2 -y xmap_overlay3.mp4
ffmpeg -i map_overlay4.mp4 -filter:v "setpts=5.0*PTS" -vsync 2 -y xmap_overlay4.mp4
ffmpeg -i map_overlay5.mp4 -filter:v "setpts=5.0*PTS" -vsync 2 -y xmap_overlay5.mp4

# How to concatenate two MP4 files using FFmpeg? 
https://stackoverflow.com/questions/7333232/how-to-concatenate-two-mp4-files-using-ffmpeg
ffmpeg -f concat -i list.txt -c copy -map 0:v -map 0:a -map 0:d:0 -y merge.mp4

# Remove first / last <X> seconds of video file
#ffmpeg -ss 00:50 -i org/GX010274.MP4 -c copy -map 0:v -map 0:a -map 0:d:1 GX010274.MP4
#ffmpeg -to 06:05 -i org/GX030279.MP4 -c copy -map 0:v -map 0:a -map 0:d:1 GX030279.MP4
ffmpeg -ss 02:40:27 -to 02:45:45 -i ../merge.mp4 -c copy -map 0:v -map 0:a -y segment-07.mp4

# Overlay the maps on the video
#ffmpeg -i segments/segments.mp4 -c:a copy -codec:v libx264 -crf 21 -preset slow -r 30000/1001 -vf "\
#  movie=xmap_overlay3.mp4[inner3]; \
#  [in][inner3] overlay=1095:1580 [out]" -y segments-with-maps.mp4
ffmpeg -i segments/segments.mp4 -c:a copy -codec:v libx264 -crf 21 -preset slow -r 30000/1001 -vf "\
  movie=xmap_overlay3.mp4[inner3]; movie=xmap_overlay4.mp4[inner4]; \
  [in][inner3] overlay=965:1550 [step2]; [step2][inner4] overlay=2425:1550 [out]" -y segments-with-maps.mp4

ffmpeg -i segments/segments.mp4 -c:a copy -codec:v libx264 -crf 21 -preset slow -r 30000/1001 -vf "\
  movie=xmap_overlay3.mp4[inner3]; movie=xmap_overlay4.mp4[inner4]; movie=xmap_overlay5.mp4[inner5]; \
  [in][inner3] overlay=835:1550 [step2]; [step2][inner4] overlay=1195:1550 [step3] ; [step3][inner5] overlay=2555:1550 [out]" -y segments-with-maps.mp4

#ffmpeg -i segments/segments.mp4 -c:a copy -codec:v libx265 -crf 22 -preset slow -r 30000/1001 -vf "\
#  movie=xmap_overlay3.mp4[inner3]; movie=xmap_overlay4.mp4[inner4]; \
#  [in][inner3] overlay=1116:1615 [step2]; [step2][inner4] overlay=2324:1615 [out]" -y segments-with-maps.mp4

# Extract image from video
ffmpeg -i GX010278.MP4 -ss 03:03 -vframes 1 -q:v 1 -vf scale=1280:720 -y image3.png

# Generate video 
ffmpeg -i map_overlay1.jpg -filter_complex "scale=1280:720,tile=1x1" -y image7.png
ffmpeg -i map_overlay2.jpg -filter_complex "scale=1280:720,tile=1x1" -y image9.png
ffmpeg -i image%d.png -filter_complex "scale=1280:720,tile=3x3" -y banner_3x3.png

# Generate title / banner
ffmpeg -i banner_3x3.png -vf "[in]drawtext=text='December 8th 2024':fontcolor=white:fontsize=170:x=1160:y=260, drawtext=text='133 miles / 214 km - 2h45 ride':fontcolor=white:fontsize=170:x=870:y=930, drawtext=text='around Sanford, Carthage and Pittsboro (NC)':fontcolor=white:fontsize=170:x=160:y=1250[out]" -y xbanner_3x3.png 
ffmpeg -loop 1 -i xbanner_3x3.png -codec:v libx265 -t 10 -pix_fmt yuv420p -crf 25 -preset fast -r 30000/1001 -y banner.mp4
ffmpeg -i banner.mp4 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 -c:a aac -shortest -d 10 -vf "setpts=PTS*((30000/1001)/30),fps=30000/1001" xbanner.mp4

# Add banner to final video
ffmpeg -f concat -safe 0 -i xlist.txt -c copy -y /hd/ride/rides/2024-12-08/2024-12-08_Sanford_Carthage_NC.mp4

# Add chapters
ffmpeg -i _2024-12-08_Sanford_Carthage_NC.mp4 -i FFMETADATAFILE.txt -map_metadata 1 -codec copy -y 2024-12-08_Sanford_Carthage_NC.mp4
