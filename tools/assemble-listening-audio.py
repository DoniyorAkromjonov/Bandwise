import json
import pathlib
import sys
import wave

segment_dir, output_dir, data_dir = map(pathlib.Path, sys.argv[1:4])
materials = json.loads((segment_dir / "manifest.json").read_text(encoding="utf-8-sig"))

for material in materials:
    segments = []
    cues = []
    elapsed_frames = 0
    params = None
    for index, text in enumerate(material["lines"]):
        path = segment_dir / f'{material["slug"]}-{index}.wav'
        with wave.open(str(path), "rb") as segment:
            current_params = segment.getparams()
            if current_params.comptype != "NONE":
                raise ValueError(f"Compressed segment is not supported: {path}")
            if params is None:
                params = current_params
            elif (current_params.nchannels, current_params.sampwidth, current_params.framerate) != (params.nchannels, params.sampwidth, params.framerate):
                raise ValueError(f"Audio format mismatch: {path}")
            frames = segment.getnframes()
            pcm = segment.readframes(frames)
        start = elapsed_frames / params.framerate
        elapsed_frames += frames
        end = elapsed_frames / params.framerate
        cues.append({"start": round(start, 3), "end": round(end, 3), "text": text})
        segments.append(pcm)

    audio_path = output_dir / f'{material["slug"]}.wav'
    with wave.open(str(audio_path), "wb") as output:
        output.setnchannels(params.nchannels)
        output.setsampwidth(params.sampwidth)
        output.setframerate(params.framerate)
        output.writeframes(b"".join(segments))
    cues_path = data_dir / f'{material["slug"]}.json'
    cues_path.write_text(json.dumps(cues, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

for segment in segment_dir.iterdir():
    segment.unlink()
segment_dir.rmdir()
