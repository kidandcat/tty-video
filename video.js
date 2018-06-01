const ytdl = require("ytdl-core");
const Throttle = require("stream-throttle").Throttle;
const ffmpeg = require("youtube-terminal/lib/ffmpeg");
const RawImageStream = require("youtube-terminal/lib/raw-image-stream");

module.exports = function(stream, url, size) {
  console.log("Size", size);
  const canvas = require("terminal-canvas").create({
    stream: stream,
    width: size.cols,
    height: size.rows
  });

  const CHARACTERS = " .,:;i1tfLCG08@".split("");

  function imageToAscii(data, width, height) {
    var contrastFactor = 2.95;
    var ascii = "";

    for (var y = 0; y < height; y += 2) {
      for (var x = 0; x < width; x++) {
        var offset = (y * width + x) * 3;
        var r = Math.max(
          0,
          Math.min(contrastFactor * (data[offset] - 128) + 128, 255)
        );
        var g = Math.max(
          0,
          Math.min(contrastFactor * (data[offset + 1] - 128) + 128, 255)
        );
        var b = Math.max(
          0,
          Math.min(contrastFactor * (data[offset + 2] - 128) + 128, 255)
        );
        var brightness = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        ascii += CHARACTERS[Math.round(brightness * 14)];
      }
    }

    return ascii;
  }

  function playVideo(info) {
    console.log("info", info.formats);
    const video = info.formats
      .filter(
        format => format.resolution === "144p" && format.audioBitrate === null
      )
      .sort((a, b) => (a.container === "webm" ? -1 : 1))[0];
    const m = video.size.match(/^(\d+)x(\d+)$/);
    const videoSize = { width: m[1], height: m[2] };
    const frameHeight = Math.round(canvas._height * 2);
    const frameWidth = Math.round(
      frameHeight * (videoSize.width / videoSize.height)
    );
    const frameSize = frameWidth * frameHeight * 3;

    ffmpeg
      .rawImageStream(video.url, { fps: 30, width: frameWidth })
      .on("start", () => canvas.saveScreen().reset())
      .on("end", () => canvas.restoreScreen())
      .pipe(new Throttle({ rate: frameSize * 30 }))
      .pipe(new RawImageStream(frameSize))
      .on("data", function(frameData) {
        var ascii = imageToAscii(frameData, frameWidth, frameHeight);

        for (var y = 0; y < frameHeight; y++) {
          for (var x = 0; x < frameWidth; x++) {
            canvas
              .moveTo(x + (canvas._width / 2 - frameWidth / 2), y)
              .write(ascii[y * frameWidth + x] || "");
          }
        }

        canvas.flush();
      });
  }

  ytdl.getInfo(url, (error, info) => {
    if (error) return console.error(error);

    playVideo(info);
  });

  process.on("SIGTERM", () => canvas.restoreScreen());
};
