import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { fetchWebContent } from "../../api/client";
import type { PatientRootStackParamList } from "../../navigation/types";
import { useThemeMode } from "../../theme/ThemeContext";
import {
  extractYoutubeVideoId,
  normalizeRelaxationEmbedSrc,
  youtubeThumbnailUrl
} from "../../wellbeing/labels";
import type { RelaxationPlaylistItem } from "../../wellbeing/types";

export function RelaxationMusicScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useThemeMode();
  const navigation = useNavigation<NativeStackNavigationProp<PatientRootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<RelaxationPlaylistItem[]>([]);
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const content = await fetchWebContent({ audience: "patient" });
      const list = Array.isArray(content.relaxationPlaylists) ? content.relaxationPlaylists : [];
      setPlaylists(list);
      if (list[0]) setSelectedId(list[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la música");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of playlists) {
      map.set(item.categoryId || "general", item.categoryLabel?.es ?? "General");
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [playlists]);

  const visible = useMemo(() => {
    if (categoryId === "all") return playlists;
    return playlists.filter((item) => (item.categoryId || "general") === categoryId);
  }, [playlists, categoryId]);

  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visible.some((item) => item.id === selectedId)) {
      setSelectedId(visible[0].id);
    }
  }, [visible, selectedId]);

  const selected = playlists.find((item) => item.id === selectedId) ?? null;
  const embedSrc = selected ? normalizeRelaxationEmbedSrc(selected.embedSrc) : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        hero: { marginHorizontal: 16, borderRadius: 22, padding: 18, gap: 6, marginBottom: 10 },
        back: { flexDirection: "row", alignItems: "center", gap: 4 },
        backText: { color: "#fff", fontWeight: "700" },
        heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
        heroLead: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
        chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          marginRight: 8
        },
        chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
        chipTextActive: { color: "#fff" },
        player: {
          marginHorizontal: 16,
          height: 220,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#111",
          marginBottom: 12
        },
        playerEmpty: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center"
        },
        playerEmptyText: { color: "rgba(255,255,255,0.8)", fontWeight: "600" },
        card: {
          flexDirection: "row",
          gap: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center"
        },
        cardActive: { borderColor: colors.primary },
        thumb: { width: 72, height: 54, borderRadius: 8, backgroundColor: colors.border },
        cardBody: { flex: 1, gap: 2 },
        cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
        cardBlurb: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
        error: { color: colors.danger, textAlign: "center", fontWeight: "700", padding: 12 },
        loader: { flex: 1, alignItems: "center", justifyContent: "center" },
        empty: { textAlign: "center", color: colors.textMuted, marginTop: 20 }
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <LinearGradient colors={[...gradients.hero]} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color="#fff" />
          <Text style={styles.backText}>Inicio</Text>
        </Pressable>
        <Text style={styles.heroTitle}>Música para relajar</Text>
        <Text style={styles.heroLead}>Escuchá en la app. Elegí un clima y reproducí sin salir.</Text>
      </LinearGradient>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        horizontal
        data={[{ id: "all", label: "Todas" }, ...categories]}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = categoryId === item.id;
          return (
            <Pressable
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCategoryId(item.id as string | "all")}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        }}
        style={{ flexGrow: 0, maxHeight: 48 }}
      />

      <View style={styles.player}>
        {embedSrc ? (
          <WebView
            source={{ uri: embedSrc }}
            style={{ flex: 1, backgroundColor: "#111" }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
          />
        ) : (
          <View style={styles.playerEmpty}>
            <Text style={styles.playerEmptyText}>Elegí un audio de la lista</Text>
          </View>
        )}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay tracks en esta categoría.</Text>}
        renderItem={({ item }) => {
          const videoId = extractYoutubeVideoId(item.embedSrc, item.openUrl);
          const active = item.id === selectedId;
          return (
            <Pressable
              style={[styles.card, active && styles.cardActive]}
              onPress={() => setSelectedId(item.id)}
            >
              {videoId ? (
                <Image source={{ uri: youtubeThumbnailUrl(videoId) }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="musical-notes" size={22} color={colors.primary} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title.es}
                </Text>
                <Text style={styles.cardBlurb} numberOfLines={2}>
                  {item.blurb.es}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
