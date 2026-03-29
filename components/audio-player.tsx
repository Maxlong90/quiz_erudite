import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

type AudioPlayerProps = {
  audioUrl: string;
  autoPlay?: boolean;
};

function formatTime(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ audioUrl, autoPlay = false }: AudioPlayerProps) {
  const theme = useColorScheme() ?? 'light';
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = Colors[theme].tint;
  const trackColor = Colors[theme].icon;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let soundInstance: Audio.Sound | null = null;

    function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
      if (!isMounted.current) return;
      if (!status.isLoaded) {
        if (status.error) {
          setError(`Playback error: ${status.error}`);
        }
        return;
      }
      setIsPlaying(status.isPlaying);
      setPositionMillis(status.positionMillis);
      setDurationMillis(status.durationMillis ?? 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }

    async function loadAudio() {
      try {
        setIsLoading(true);
        setError(null);

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: autoPlay },
          onPlaybackStatusUpdate
        );

        if (!isMounted.current) {
          await newSound.unloadAsync();
          return;
        }

        soundInstance = newSound;
        setSound(newSound);
        setIsLoading(false);

        if (status.isLoaded) {
          setDurationMillis(status.durationMillis ?? 0);
          if (status.isPlaying) setIsPlaying(true);
        }
      } catch {
        if (isMounted.current) {
          setError('Failed to load audio');
          setIsLoading(false);
        }
      }
    }

    loadAudio();

    return () => {
      isMounted.current = false;
      if (soundInstance) {
        soundInstance.unloadAsync();
      }
    };
  }, [audioUrl, autoPlay]);

  async function handlePlayPause() {
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch {
      setError('Playback failed');
    }
  }

  async function handleReplay() {
    if (!sound) return;
    try {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {
      setError('Replay failed');
    }
  }

  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: Colors[theme].background }]}
        accessibilityLabel="Loading audio"
      >
        <ActivityIndicator size="small" color={tintColor} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.container, { backgroundColor: Colors[theme].background }]}
        accessibilityRole="alert"
      >
        <MaterialIcons name="error-outline" size={20} color="#dc3545" />
        <Text style={[styles.errorText, { color: '#dc3545' }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Pressable
        onPress={handlePlayPause}
        style={[styles.playButton, { backgroundColor: tintColor }]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        <MaterialIcons
          name={isPlaying ? 'pause' : 'play-arrow'}
          size={28}
          color={theme === 'dark' ? '#151718' : '#fff'}
        />
      </Pressable>

      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: trackColor + '4D' }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: tintColor },
            ]}
          />
        </View>
        <Text
          style={[styles.timeText, { color: textColor }]}
          accessibilityLabel={`${formatTime(positionMillis)} of ${formatTime(durationMillis)}`}
        >
          {formatTime(positionMillis)} / {formatTime(durationMillis)}
        </Text>
      </View>

      <Pressable
        onPress={handleReplay}
        style={styles.replayButton}
        accessibilityRole="button"
        accessibilityLabel="Replay audio"
      >
        <MaterialIcons name="replay" size={24} color={iconColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    flex: 1,
    gap: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  replayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
