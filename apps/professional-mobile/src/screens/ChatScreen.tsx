import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getChatThreads, getThreadMessages, markThreadRead, sendThreadMessage } from "../api/client";
import type { ThreadMessage, ThreadSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { PersonAvatar } from "../components/PersonAvatar";
import { Screen } from "../components/Screen";
import { useChrome } from "../navigation/ChromeContext";
import { colors, radii } from "../theme/colors";
import { formatThreadTime } from "../utils/format";

export function ChatScreen() {
  const { token, user } = useAuth();
  const { openDrawer, setTabBarHidden } = useChrome();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [active, setActive] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ThreadMessage>>(null);

  const loadThreads = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await getChatThreads(token);
    setThreads(data.threads ?? []);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadThreads().finally(() => setLoading(false));
      return () => {
        setTabBarHidden(false);
        setActive(null);
      };
    }, [loadThreads, setTabBarHidden])
  );

  useEffect(() => {
    setTabBarHidden(Boolean(active));
  }, [active, setTabBarHidden]);

  useEffect(() => {
    if (!token || !active) {
      return;
    }
    let alive = true;
    const loadMessages = async () => {
      try {
        const data = await getThreadMessages(token, active.id);
        if (alive) {
          setMessages(data.messages ?? []);
        }
      } catch {
        // noop
      }
    };
    void loadMessages();
    void markThreadRead(token, active.id);
    const interval = setInterval(() => void loadMessages(), 8000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [active, token]);

  if (active) {
    return (
      <SafeAreaView style={styles.chatSafe} edges={["top", "left", "right"]}>
        <View style={styles.chatHead}>
          <Pressable onPress={() => setActive(null)} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <PersonAvatar uri={active.counterpartPhotoUrl} name={active.counterpartName} size={36} />
          <Text style={styles.chatName} numberOfLines={1}>
            {active.counterpartName}
          </Text>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.bubbles}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const mine = item.senderUserId === user?.id;
              return (
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>{item.body}</Text>
                </View>
              );
            }}
          />
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Mensaje"
              style={styles.input}
              multiline
            />
            <Pressable
              disabled={sending || !draft.trim()}
              style={styles.send}
              onPress={() => {
                if (!token || !draft.trim()) {
                  return;
                }
                const body = draft.trim();
                setDraft("");
                setSending(true);
                void sendThreadMessage(token, active.id, body)
                  .then((response) => setMessages((current) => [...current, response.message]))
                  .finally(() => setSending(false));
              }}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <Screen>
      <AppHeader title="Chat" onMore={openDrawer} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.inbox}
        renderItem={({ item }) => (
          <Pressable style={styles.thread} onPress={() => setActive(item)}>
            <PersonAvatar uri={item.counterpartPhotoUrl} name={item.counterpartName} size={56} />
            <View style={styles.threadCopy}>
              <View style={styles.threadTop}>
                <Text style={styles.threadName} numberOfLines={1}>
                  {item.counterpartName}
                </Text>
                <Text style={styles.threadTime}>
                  {formatThreadTime(item.lastMessage?.createdAt ?? item.createdAt)}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage?.body || "Sin mensajes"}
              </Text>
            </View>
            {item.unreadCount > 0 ? (
              <View style={styles.unread}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Todavía no hay conversaciones.</Text> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inbox: { paddingBottom: 110 },
  thread: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  threadCopy: { flex: 1, minWidth: 0 },
  threadTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  threadName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  threadTime: { fontSize: 12, color: colors.muted },
  preview: { marginTop: 3, fontSize: 13, color: colors.muted },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  empty: { marginTop: 24, textAlign: "center", color: colors.muted },
  chatSafe: { flex: 1, backgroundColor: colors.chatCanvas },
  chatHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    minHeight: 52,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  chatName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  bubbles: { padding: 12, gap: 8, paddingBottom: 16 },
  bubble: {
    maxWidth: "82%",
    borderRadius: radii.control,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: colors.bubbleMine },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: "#fff" },
  bubbleText: { fontSize: 15, color: colors.text },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    backgroundColor: "#F0F2F5"
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.control,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  }
});
