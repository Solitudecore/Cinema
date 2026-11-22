import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";

type Props = {
  videoId: string;
  width?: number;
  height?: number;
  play?: boolean;
  mute?: boolean;
  onReady?: () => void;
  onPlaying?: () => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
  onError?: () => void;
  onEnded?: () => void;
};

export default function TrailerPlayer({
  videoId,
  width,
  height = 210,
  play = false,
  mute = false,
  onReady,
  onPlaying,
  onFullScreenChange,
  onError,
  onEnded,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isReadyRef = useRef(false);
  const latestStateRef = useRef({ play, mute });
  latestStateRef.current = { play, mute };

  const callbacksRef = useRef({
    onReady,
    onPlaying,
    onFullScreenChange,
    onError,
    onEnded,
  });
  callbacksRef.current = {
    onReady,
    onPlaying,
    onFullScreenChange,
    onError,
    onEnded,
  };

  const sendPlayerCommand = (func: string) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: "command",
          func,
          args: [],
        }),
        "*",
      );
    } catch {}
  };

  useEffect(() => {
    isReadyRef.current = false;
  }, [videoId]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    sendPlayerCommand(play ? "playVideo" : "pauseVideo");
  }, [play]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    sendPlayerCommand(mute ? "mute" : "unMute");
  }, [mute]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.origin !== "string" ||
        (!event.origin.includes("youtube.com") &&
          !event.origin.includes("youtube-nocookie.com"))
      ) {
        return;
      }

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (!data || typeof data !== "object") return;

        if (data.event === "onReady") {
          isReadyRef.current = true;
          const current = latestStateRef.current;
          sendPlayerCommand(current.mute ? "mute" : "unMute");
          if (current.play) {
            sendPlayerCommand("playVideo");
          }
          callbacksRef.current.onReady?.();
        } else if (data.event === "onStateChange") {
          if (data.info === 1) {
            callbacksRef.current.onPlaying?.();
          } else if (data.info === 0) {
            callbacksRef.current.onEnded?.();
          }
        } else if (data.event === "onError") {
          callbacksRef.current.onError?.();
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      callbacksRef.current.onFullScreenChange?.(isFull);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      enablejsapi: "1",
      autoplay: latestStateRef.current.play ? "1" : "0",
      mute: latestStateRef.current.mute ? "1" : "0",
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  const handleIframeLoad = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*",
      );
    } catch {}

    if (!isReadyRef.current) {
      isReadyRef.current = true;
      callbacksRef.current.onReady?.();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: width ?? "100%",
          height,
        },
      ]}
    >
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        src={embedUrl}
        title="Official Trailer"
        frameBorder="0"
        onLoad={handleIframeLoad}
        onError={() => callbacksRef.current.onError?.()}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        style={{ border: "none", display: "block" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    overflow: "hidden",
  },
});
