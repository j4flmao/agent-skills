# Audio Models

## Model Comparison

| Model | Task | Quality | Latency | Cost | Self-Hostable |
|-------|------|---------|---------|------|---------------|
| Whisper large-v3 | Transcription | Excellent | Medium | $0.006/min | Yes |
| Deepgram Nova-2 | Transcription | Excellent | Low | $0.004/min | No |
| AssemblyAI | Transcription | Very Good | Medium | $0.005/min | No |
| ElevenLabs | TTS | Excellent | Low | $0.001/char | No |
| Bark | TTS | Good | High | Free | Yes |
| Hume AI | Voice cloning | Excellent | Medium | $0.002/sec | No |
| WhisperX | Transcription + diarization | Very Good | Medium | Free | Yes |

## Transcription (Speech-to-Text)

### Whisper Implementation
```python
import whisper

model = whisper.load_model("large-v3")

def transcribe_audio(audio_path):
    result = model.transcribe(
        audio_path,
        language="en",
        task="transcribe",
        temperature=0.0,
        compress_dynamics=True,
    )
    return {
        "text": result["text"],
        "segments": result["segments"],
        "language": result["language"],
    }
```

### Cost Optimization
```
Raw audio (1 hour): ~$0.36 (Whisper API)
Self-hosted Whisper (1 hour): ~$0.01 (compute cost)
Savings: 36x at scale
```

### Diarization (Speaker Identification)
```python
import whisperx

model = whisperx.load_model("large-v3", device="cuda")
audio = whisperx.load_audio("meeting.wav")
result = model.transcribe(audio)

# Align with speaker diarization
diarize_model = whisperx.DiarizationPipeline(use_auth_token=HF_TOKEN)
diarize_segments = diarize_model(audio)

# Assign speakers to transcribed segments
result = whisperx.assign_word_speakers(diarize_segments, result)
```

## Text-to-Speech

### ElevenLabs
```python
from elevenlabs import clone, generate, play, Voice, VoiceSettings

audio = generate(
    text="Hello, this is a generated voice.",
    voice="Rachel",
    model="eleven_multilingual_v2",
    voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.75)
)
play(audio)
```

### Self-Hosted TTS with Bark
```python
from bark import SAMPLE_RATE, generate_audio, preload_models

preload_models(text_use_small=True)

audio_array = generate_audio("Hello, this is a test.")
# 5 seconds → ~$0.0001 compute cost
```

## Audio Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| WER (Word Error Rate) | Transcription accuracy | <5% |
| SER (Speaker Error Rate) | Diarization accuracy | <10% |
| MOS (Mean Opinion Score) | TTS naturalness (1-5) | >4.0 |
| Real-Time Factor | Processing speed vs real-time | <1.0 |

## Best Practices

### Audio Preprocessing
```python
import librosa

def preprocess_audio(audio_path):
    # Load and resample to 16kHz
    audio, sr = librosa.load(audio_path, sr=16000, mono=True)
    
    # Normalize volume
    audio = librosa.util.normalize(audio)
    
    # Remove silence
    audio, _ = librosa.effects.trim(audio, top_db=20)
    
    return audio
```

### Handling Long Audio
- Split at silence/pause boundaries (>500ms silence)
- Process chunks in parallel
- Merge transcriptions with overlap handling
- 10-minute chunks maximum for Whisper

### Multi-Language
- Set language explicitly for better accuracy
- Use multilingual models (Whisper, ElevenLabs)
- Evaluate WER per language separately
- Consider language-specific fine-tuning
