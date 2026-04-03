import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { resolveAvatarUri } from "../lib/resolveAvatarUri";
import { useThemeMode } from "../theme/ThemeContext";

type Props = {
  uri?: string | null;
  name: string;
  size: number;
};

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = (parts[0]?.[0] ?? "?").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  return b ? `${a}${b}` : a;
}

export function PersonAvatar(props: Props) {
  const { uri: uriProp, name, size } = props;
  const resolved = useMemo(() => resolveAvatarUri(uriProp), [uriProp]);
  const uri = (resolved ?? "").trim();
  const { colors } = useThemeMode();
  const styles = useMemo(() => buildAvatarStyles(colors), [colors]);
  const initials = useMemo(() => initialsFromName(name), [name]);
  const radius = size / 2;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  if (uri.length > 0 && !imageFailed) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden" }}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => {
            setImageFailed(true);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.34) }]}>{initials}</Text>
    </View>
  );
}

function buildAvatarStyles(c: import("../theme/colors").AppThemeColors) {
  return StyleSheet.create({
    fallback: {
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center"
    },
    initials: {
      fontWeight: "700",
      color: c.primaryDark,
      letterSpacing: -0.5
    }
  });
}
