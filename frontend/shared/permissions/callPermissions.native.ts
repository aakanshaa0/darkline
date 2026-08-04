import { PermissionsAndroid, Platform } from "react-native";

/**
 * RECORD_AUDIO and CAMERA are "dangerous" permissions: declaring them in
 * AndroidManifest is necessary but not sufficient on Android 6+, they must
 * also be granted at runtime. Without this, getUserMedia rejects and the call
 * dies before any signaling happens.
 */
export async function ensureCallPermissions(kind: "audio" | "video"): Promise<boolean> {
  if (Platform.OS !== "android") return true; // iOS prompts via Info.plist on first use

  const wanted = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (kind === "video") wanted.push(PermissionsAndroid.PERMISSIONS.CAMERA);

  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
}
