import { useEffect, useRef, useState } from "react";

export type DeviceTestStatus = "idle" | "requesting" | "ready" | "denied" | "unavailable" | "error";

export type DeviceTestErrorCode =
  | "unsupported"
  | "insecure"
  | "denied"
  | "not_found"
  | "camera_only"
  | "mic_only"
  | "busy"
  | "generic";

export type DeviceTestDevice = {
  deviceId: string;
  label: string;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function errorName(error: unknown): string {
  return error instanceof DOMException ? error.name : "";
}

export function useDeviceTest(active: boolean) {
  const [status, setStatus] = useState<DeviceTestStatus>("idle");
  const [errorCode, setErrorCode] = useState<DeviceTestErrorCode | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [cameras, setCameras] = useState<DeviceTestDevice[]>([]);
  const [mics, setMics] = useState<DeviceTestDevice[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [micId, setMicId] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const runIdRef = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  async function listDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const nextCameras = devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`
      }));
    const nextMics = devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`
      }));
    setCameras(nextCameras);
    setMics(nextMics);
    setCameraId((current) => current || nextCameras[0]?.deviceId || "");
    setMicId((current) => current || nextMics[0]?.deviceId || "");
    return { nextCameras, nextMics };
  }

  function stopMeter() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicLevel(0);
  }

  function startMeter(media: MediaStream) {
    stopMeter();
    const audioTracks = media.getAudioTracks();
    if (audioTracks.length === 0) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const source = context.createMediaStreamSource(media);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = context;
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      const node = analyserRef.current;
      if (!node) return;
      node.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      setMicLevel(Math.min(1, average / 90));
      rafRef.current = requestAnimationFrame(tick);
    };
    void context.resume();
    tick();
  }

  function applyFailure(error: unknown): DeviceTestStatus {
    const name = errorName(error);
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setErrorCode("denied");
      return "denied";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      setErrorCode("not_found");
      return "unavailable";
    }
    if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
      setErrorCode("busy");
      return "error";
    }
    if (name === "OverconstrainedError") {
      setErrorCode("busy");
      return "error";
    }
    setErrorCode("generic");
    return "error";
  }

  async function openStream(video: MediaTrackConstraints | boolean, audio: MediaTrackConstraints | boolean) {
    return navigator.mediaDevices.getUserMedia({ video, audio });
  }

  async function start(overrides?: { cameraId?: string; micId?: string }) {
    const runId = ++runIdRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      setErrorCode("unsupported");
      return;
    }
    if (!window.isSecureContext) {
      setStatus("unavailable");
      setErrorCode("insecure");
      return;
    }

    setStatus("requesting");
    setErrorCode(null);
    stopMeter();
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);

    const chosenCamera = overrides?.cameraId || cameraId;
    const chosenMic = overrides?.micId || micId;
    const videoConstraint: MediaTrackConstraints | boolean = chosenCamera
      ? { deviceId: { exact: chosenCamera }, facingMode: "user" }
      : { facingMode: "user" };
    const audioConstraint: MediaTrackConstraints | boolean = chosenMic
      ? {
          deviceId: { exact: chosenMic },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

    try {
      let media: MediaStream;
      try {
        media = await openStream(videoConstraint, audioConstraint);
      } catch (bothError) {
        if (!activeRef.current || runId !== runIdRef.current) return;
        // Diagnóstico: a veces falla uno solo; abrimos el que sí anda.
        let videoStream: MediaStream | null = null;
        let audioStream: MediaStream | null = null;
        try {
          videoStream = await openStream(videoConstraint, false);
        } catch {
          videoStream = null;
        }
        try {
          audioStream = await openStream(false, audioConstraint);
        } catch {
          audioStream = null;
        }
        if (!activeRef.current || runId !== runIdRef.current) {
          stopStream(videoStream);
          stopStream(audioStream);
          return;
        }
        if (videoStream && audioStream) {
          audioStream.getAudioTracks().forEach((track) => videoStream!.addTrack(track));
          media = videoStream;
        } else if (videoStream) {
          media = videoStream;
          setErrorCode("mic_only");
        } else if (audioStream) {
          media = audioStream;
          setErrorCode("camera_only");
        } else {
          stopStream(videoStream);
          stopStream(audioStream);
          setStatus(applyFailure(bothError));
          return;
        }
      }

      if (!activeRef.current || runId !== runIdRef.current) {
        stopStream(media);
        return;
      }

      streamRef.current = media;
      setStream(media);
      startMeter(media);
      const listed = await listDevices();
      if (!activeRef.current || runId !== runIdRef.current) {
        stopMeter();
        stopStream(media);
        streamRef.current = null;
        setStream(null);
        return;
      }
      const videoTrack = media.getVideoTracks()[0];
      const audioTrack = media.getAudioTracks()[0];
      if (videoTrack) {
        const matched = listed.nextCameras.find((device) => device.deviceId === videoTrack.getSettings().deviceId);
        if (matched) setCameraId(matched.deviceId);
      }
      if (audioTrack) {
        const matched = listed.nextMics.find((device) => device.deviceId === audioTrack.getSettings().deviceId);
        if (matched) setMicId(matched.deviceId);
      }
      setStatus("ready");
    } catch (error) {
      if (!activeRef.current || runId !== runIdRef.current) return;
      stopMeter();
      stopStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
      setStatus(applyFailure(error));
    }
  }

  function stop(resetStatus = true) {
    runIdRef.current += 1;
    stopMeter();
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    if (resetStatus) {
      setStatus("idle");
      setErrorCode(null);
    }
  }

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    void start();
    return () => {
      runIdRef.current += 1;
      stopMeter();
      stopStream(streamRef.current);
      streamRef.current = null;
    };
    // Solo al abrir/cerrar el modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function selectCamera(nextId: string) {
    setCameraId(nextId);
    if (active) await start({ cameraId: nextId, micId });
  }

  async function selectMic(nextId: string) {
    setMicId(nextId);
    if (active) await start({ cameraId, micId: nextId });
  }

  return {
    status,
    errorCode,
    stream,
    micLevel,
    cameras,
    mics,
    cameraId,
    micId,
    hasVideo: Boolean(stream?.getVideoTracks().length),
    hasAudio: Boolean(stream?.getAudioTracks().length),
    retry: () => void start(),
    selectCamera: (id: string) => void selectCamera(id),
    selectMic: (id: string) => void selectMic(id),
    stop
  };
}
