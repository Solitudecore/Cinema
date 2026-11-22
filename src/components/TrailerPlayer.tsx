import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

type Props = {
  videoId: string;
  width?: number;
  height?: number;
  play?: boolean;
  mute?: boolean;
  onReady?: () => void;
  onPlaying?: () => void;
  onError?: () => void;
  onEnded?: () => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
};

export default function TrailerPlayer({
  videoId,
  width,
  height,
  play = true,
  mute = false,
  onReady,
  onPlaying,
  onError,
  onEnded,
  onFullScreenChange,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [isReady, setIsReady] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(width ?? windowWidth);

  const activeWidth = width ?? measuredWidth;
  const activeHeight = height ?? Math.round(activeWidth * (9 / 16));

  useEffect(() => {
    setIsReady(false);
  }, [videoId]);

  return (
    <View
      style={[styles.container, { width: activeWidth, height: activeHeight }]}
      onLayout={(e) => {
        if (!width) {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== measuredWidth) {
            setMeasuredWidth(w);
          }
        }
      }}
    >
      {!isReady && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}

      <YoutubePlayer
        key={`${videoId}_${activeWidth}_${activeHeight}`}
        width={activeWidth}
        height={activeHeight}
        play={play && isReady}
        mute={mute}
        videoId={videoId}
        forceAndroidAutoplay
        onReady={() => {
          setIsReady(true);
          onReady?.();
        }}
        onError={onError}
        onFullScreenChange={onFullScreenChange}
        onChangeState={(state: string) => {
          if (state === "playing") {
            onPlaying?.();
          }
          if (state === "ended") {
            onEnded?.();
          }
        }}
        initialPlayerParams={{
          rel: false,
          modestbranding: true,
          fs: true,
        }}
        webViewStyle={styles.webView}
        webViewProps={{
          javaScriptEnabled: true,
          domStorageEnabled: true,
          allowsInlineMediaPlayback: true,
          allowsFullscreenVideo: true,
          mediaPlaybackRequiresUserAction: false,
          androidLayerType: "hardware",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    overflow: "hidden",
    justifyContent: "center",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  webView: {
    opacity: 0.99,
  },
});
