import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { avatarInitialsFromNameParts } from "@therapy/types";
import { resolveAvatarUri } from "../lib/resolveAvatarUri";
import { colors, radii } from "../theme/colors";

type Props = {
  uri?: string | null;
  name: string;
  size?: number;
};

export function PersonAvatar(props: Props) {
  const size = props.size ?? 72;
  const uri = (resolveAvatarUri(props.uri) ?? "").trim();
  const initials = useMemo(
    () => avatarInitialsFromNameParts("", "", props.name),
    [props.name]
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radii.control }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size }]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.32) }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: radii.control,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center"
  },
  initials: {
    fontWeight: "700",
    color: colors.primaryDark
  }
});
