import { type RefObject } from 'react';
import { Platform, Share, TurboModuleRegistry, type View } from 'react-native';

/**
 * Capture an off-screen composition (the ShareCard host) to a temp PNG via
 * react-native-view-shot. Returns the file uri, or null if the capture failed.
 * react-native-view-shot is a native module bundled in Expo Go, but a standalone
 * binary built before the dependency was added won't have it. Probe the TurboModule
 * registry FIRST (get() returns null without throwing) so we never trigger the
 * library's throwing getEnforcing init — that would surface a dev error overlay
 * even though we catch it. When the module is absent we simply share text only.
 */
async function captureShareImage(ref: RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  if (!TurboModuleRegistry.get('RNViewShot')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so the native module only loads when it is actually present
    const { captureRef } = require('react-native-view-shot');
    return await captureRef(ref, { format: 'png', quality: 0.95 });
  } catch {
    return null;
  }
}

/**
 * Share an image file through expo-sharing. Returns true when the share sheet was
 * presented, false when sharing is unavailable so the caller can fall back to a
 * text-only invite. Probe the native module registry FIRST so we never trigger the
 * throwing requireNativeModule init.
 */
async function shareImageFile(imageUri: string, dialogTitle: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- expo-modules-core is always present; used to probe for the optional native module
    const { requireOptionalNativeModule } = require('expo-modules-core');
    if (!requireOptionalNativeModule('ExpoSharing')) return false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so the native module only loads when it is actually present
    const Sharing = require('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(imageUri, { mimeType: 'image/png', dialogTitle });
    return true;
  } catch {
    return false;
  }
}

/**
 * Share the current question: capture the off-screen ShareCard to a PNG and send
 * it alongside the invite `message` (mirrors Logo Quiz's "Share a logo"). iOS's
 * share sheet carries the file url AND the message together; on Android the image
 * goes via expo-sharing (which can't ride text, so the invite becomes the chooser
 * title). With no capture available it falls back to the text-only invite.
 */
export async function shareQuestionImage(
  ref: RefObject<View | null>,
  message: string,
): Promise<void> {
  try {
    const imageUri = await captureShareImage(ref);
    if (imageUri && Platform.OS === 'ios') {
      await Share.share({ message, url: imageUri });
    } else if (imageUri && (await shareImageFile(imageUri, message))) {
      // shared with the picture
    } else {
      await Share.share({ message });
    }
  } catch {
    // user cancelled or the platform rejected — nothing to do
  }
}
