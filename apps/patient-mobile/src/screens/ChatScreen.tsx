import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { PersonAvatar } from "../components/PersonAvatar";
import {
  ensureChatThreadByProfessional,
  getChatThreads,
  getMatchingProfessionals,
  getThreadMessages,
  markThreadAsRead,
  sendThreadMessage
} from "../api/client";
import type { ChatMessage, ChatThread } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useThemeMode } from "../theme/ThemeContext";
import { formatTime } from "../utils/date";
import { buildChatStyles } from "./chatScreenStyles";

/** Barra de tabs flotante: `bottom` + `height` en MainTabs (+ margen). */
const TAB_BAR_OVERLAY_PAD = 14 + 68 + 12;

/** Ancho mínimo para layout tipo WhatsApp (lista | conversación). */
const SPLIT_LAYOUT_MIN_WIDTH = 640;

const CHAT_REFRESH_INTERVAL_MS = 3500;

type ProMeta = { fullName: string; photoUrl: string | null };

type InboxRow =
  | { kind: "thread"; key: string; thread: ChatThread }
  | { kind: "pending"; key: string; professionalId: string; name: string; photoUrl: string | null };

function buildInboxRows(
  threads: ChatThread[],
  availableProfessionalIds: string[],
  proMetaById: Map<string, ProMeta>
): InboxRow[] {
  const byPro = new Map(threads.map((t) => [t.professionalId, t]));
  const threadRows: InboxRow[] = threads.map((thread) => ({
    kind: "thread",
    key: `t-${thread.id}`,
    thread
  }));
  threadRows.sort((a, b) => {
    if (a.kind !== "thread" || b.kind !== "thread") {
      return 0;
    }
    const ta = new Date(a.thread.lastMessage?.createdAt ?? a.thread.createdAt).getTime();
    const tb = new Date(b.thread.lastMessage?.createdAt ?? b.thread.createdAt).getTime();
    return tb - ta;
  });

  const pendingRows: InboxRow[] = [];
  for (const pid of availableProfessionalIds) {
    if (byPro.has(pid)) {
      continue;
    }
    const meta = proMetaById.get(pid);
    pendingRows.push({
      kind: "pending",
      key: `p-${pid}`,
      professionalId: pid,
      name: meta?.fullName ?? "Profesional",
      photoUrl: meta?.photoUrl ?? null
    });
  }
  pendingRows.sort((a, b) => {
    if (a.kind !== "pending" || b.kind !== "pending") {
      return 0;
    }
    return a.name.localeCompare(b.name, "es");
  });

  return [...threadRows, ...pendingRows];
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isSplit = windowWidth >= SPLIT_LAYOUT_MIN_WIDTH;
  const isSplitRef = useRef(isSplit);
  isSplitRef.current = isSplit;

  const leftPanelWidth = useMemo(
    () => Math.min(380, Math.max(268, Math.round(windowWidth * 0.36))),
    [windowWidth]
  );

  const { token, user } = useAuth();
  const { colors, mode } = useThemeMode();
  const styles = useMemo(() => buildChatStyles(colors, mode), [colors, mode]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [availableProfessionalIds, setAvailableProfessionalIds] = useState<string[]>([]);
  const [proMetaById, setProMetaById] = useState<Map<string, ProMeta>>(new Map());
  const [viewMode, setViewMode] = useState<"inbox" | "chat">("inbox");
  const viewModeRef = useRef<"inbox" | "chat">("inbox");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [openingProId, setOpeningProId] = useState<string | null>(null);

  const activeThreadIdRef = useRef<string | null>(null);
  activeThreadIdRef.current = activeThreadId;
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const syncGenRef = useRef(0);

  const activeThread = useMemo(
    () => threads.find((item) => item.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  );

  const fetchThreadsSnapshot = useCallback(async () => {
    if (!token) {
      return { list: [] as ChatThread[], availableIds: [] as string[] };
    }
    const response = await getChatThreads(token);
    const list = response.threads ?? [];
    const availableIds = response.availableProfessionalIds ?? [];
    return { list, availableIds };
  }, [token]);

  const loadMessages = useCallback(
    async (threadId: string, gen: number) => {
      if (!token) {
        return;
      }
      const response = await getThreadMessages({ token, threadId, limit: 200 });
      if (gen !== syncGenRef.current) {
        return;
      }
      setMessages(response.messages);
      try {
        await markThreadAsRead({ token, threadId });
      } catch {
        // noop
      }
    },
    [token]
  );

  const runSync = useCallback(
    async (showLoader: boolean, gen: number) => {
      if (!token) {
        return;
      }
      if (showLoader) {
        setLoading(true);
      }
      setError("");
      try {
        const snap = await fetchThreadsSnapshot();
        if (gen !== syncGenRef.current) {
          return;
        }

        setThreads(snap.list);
        setAvailableProfessionalIds(snap.availableIds);

        const prefer = activeThreadIdRef.current;
        if (prefer && !snap.list.some((t) => t.id === prefer)) {
          setActiveThreadId(null);
          activeThreadIdRef.current = null;
          setMessages([]);
          if (viewModeRef.current === "chat" && !isSplitRef.current) {
            setViewMode("inbox");
          }
        }

        if (snap.list.length === 0 && viewModeRef.current === "chat" && !prefer && !isSplitRef.current) {
          setMessages([]);
        }

        const canLoadMessages =
          Boolean(activeThreadIdRef.current) &&
          snap.list.some((t) => t.id === activeThreadIdRef.current) &&
          (viewModeRef.current === "chat" || isSplitRef.current);

        if (canLoadMessages && activeThreadIdRef.current) {
          await loadMessages(activeThreadIdRef.current, gen);
        }
      } catch (syncError) {
        if (gen === syncGenRef.current) {
          setError(syncError instanceof Error ? syncError.message : "No se pudo actualizar el chat");
        }
      } finally {
        if (gen === syncGenRef.current && showLoader) {
          setLoading(false);
        }
      }
    },
    [fetchThreadsSnapshot, loadMessages, token]
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setLoading(false);
        return;
      }
      let alive = true;
      const tick = (showLoader: boolean) => {
        if (!alive) {
          return;
        }
        const gen = ++syncGenRef.current;
        void runSync(showLoader, gen);
      };
      tick(true);
      const interval = setInterval(() => tick(false), CHAT_REFRESH_INTERVAL_MS);
      return () => {
        alive = false;
        syncGenRef.current += 1;
        clearInterval(interval);
      };
    }, [token, runSync])
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setProMetaById(new Map());
        return;
      }
      let active = true;
      void (async () => {
        try {
          const res = await getMatchingProfessionals(token);
          if (!active) {
            return;
          }
          const next = new Map<string, ProMeta>();
          for (const p of res.professionals ?? []) {
            next.set(p.id, { fullName: p.fullName, photoUrl: p.photoUrl });
          }
          setProMetaById(next);
        } catch {
          if (active) {
            setProMetaById(new Map());
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [token])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active" && token) {
        const gen = ++syncGenRef.current;
        void runSync(false, gen);
      }
    });
    return () => sub.remove();
  }, [token, runSync]);

  /** Al pasar a modo teléfono con conversación activa, mostrar el hilo (no la lista sola). */
  useEffect(() => {
    if (!isSplit && activeThreadId) {
      viewModeRef.current = "chat";
      setViewMode("chat");
    }
  }, [isSplit, activeThreadId]);

  const inboxRows = useMemo(
    () => buildInboxRows(threads, availableProfessionalIds, proMetaById),
    [threads, availableProfessionalIds, proMetaById]
  );

  const openExistingThread = useCallback(
    (thread: ChatThread) => {
      Keyboard.dismiss();
      if (!isSplitRef.current) {
        viewModeRef.current = "chat";
        setViewMode("chat");
      }
      const gen = ++syncGenRef.current;
      setActiveThreadId(thread.id);
      activeThreadIdRef.current = thread.id;
      void loadMessages(thread.id, gen);
    },
    [loadMessages]
  );

  const openPendingProfessional = useCallback(
    async (professionalId: string) => {
      if (!token || openingProId) {
        return;
      }
      Keyboard.dismiss();
      setOpeningProId(professionalId);
      setError("");
      try {
        const { threadId } = await ensureChatThreadByProfessional({ token, professionalId });
        const gen = ++syncGenRef.current;
        await runSync(false, gen);
        if (!isSplitRef.current) {
          viewModeRef.current = "chat";
          setViewMode("chat");
        }
        setActiveThreadId(threadId);
        activeThreadIdRef.current = threadId;
        void loadMessages(threadId, gen);
      } catch (openError) {
        setError(openError instanceof Error ? openError.message : "No se pudo abrir el chat");
      } finally {
        setOpeningProId(null);
      }
    },
    [loadMessages, openingProId, runSync, token]
  );

  const goToInbox = useCallback(() => {
    Keyboard.dismiss();
    viewModeRef.current = "inbox";
    setViewMode("inbox");
    setMessages([]);
    setDraft("");
    setActiveThreadId(null);
    activeThreadIdRef.current = null;
    const gen = ++syncGenRef.current;
    void runSync(false, gen);
  }, [runSync]);

  const listData = useMemo(() => [...messages].reverse(), [messages]);

  const send = useCallback(async () => {
    const text = draft.trim();
    const threadId = activeThreadIdRef.current;
    if (!token || !threadId || !text || sending) {
      return;
    }

    setSending(true);
    setError("");
    try {
      const response = await sendThreadMessage({
        token,
        threadId,
        body: text
      });

      setMessages((current) => [
        ...current,
        {
          id: response.message.id,
          body: response.message.body,
          createdAt: response.message.createdAt,
          readAt: null,
          senderName: response.message.senderName,
          senderRole: response.message.senderRole,
          senderUserId: response.message.senderUserId
        }
      ]);
      setDraft("");
      Keyboard.dismiss();
      const gen = ++syncGenRef.current;
      await runSync(false, gen);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }, [draft, runSync, sending, token]);

  const bottomPad = insets.bottom + TAB_BAR_OVERLAY_PAD;

  const photoForThread = useCallback(
    (thread: ChatThread) =>
      (thread.counterpartPhotoUrl?.trim() || proMetaById.get(thread.professionalId)?.photoUrl) ?? null,
    [proMetaById]
  );

  const renderInboxRow = useCallback(
    ({ item }: { item: InboxRow }) => {
      const avSize = isSplit ? 46 : 52;
      if (item.kind === "thread") {
        const { thread } = item;
        const selected = isSplit && activeThreadId === thread.id;
        const preview = thread.lastMessage?.body?.trim() || "Sin mensajes aún";
        const timeSrc = thread.lastMessage?.createdAt ?? thread.createdAt;
        return (
          <Pressable
            style={({ pressed }) => [
              styles.inboxRow,
              isSplit && styles.inboxRowSplit,
              selected && styles.inboxRowSelected,
              pressed && styles.inboxRowPressed
            ]}
            onPress={() => openExistingThread(thread)}
          >
            <PersonAvatar uri={photoForThread(thread)} name={thread.counterpartName} size={avSize} />
            <View style={styles.inboxRowBody}>
              <View style={styles.inboxRowTop}>
                <Text style={[styles.inboxName, isSplit && styles.inboxNameSplit]} numberOfLines={1}>
                  {thread.counterpartName}
                </Text>
                <Text style={styles.inboxTime}>{formatTime(timeSrc, "es-AR")}</Text>
              </View>
              <View style={styles.inboxRowBottom}>
                <Text style={[styles.inboxPreview, isSplit && styles.inboxPreviewSplit]} numberOfLines={isSplit ? 1 : 2}>
                  {preview}
                </Text>
                {thread.unreadCount > 0 ? (
                  <View style={styles.inboxUnreadDot}>
                    <Text style={styles.inboxUnreadText}>
                      {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            {!isSplit ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
          </Pressable>
        );
      }

      const busy = openingProId === item.professionalId;
      return (
        <Pressable
          style={({ pressed }) => [styles.inboxRow, isSplit && styles.inboxRowSplit, pressed && styles.inboxRowPressed]}
          onPress={() => void openPendingProfessional(item.professionalId)}
          disabled={Boolean(openingProId)}
        >
          <PersonAvatar uri={item.photoUrl} name={item.name} size={avSize} />
          <View style={styles.inboxRowBody}>
            <Text style={[styles.inboxName, isSplit && styles.inboxNameSplit]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.inboxPendingHint, isSplit && styles.inboxPendingHintSplit]}>
              Tocá para abrir la conversación
            </Text>
          </View>
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
        </Pressable>
      );
    },
    [activeThreadId, colors.textSubtle, isSplit, openingProId, openExistingThread, openPendingProfessional, photoForThread, styles]
  );

  const conversationTitle = activeThread?.counterpartName ?? proMetaById.get(activeThread?.professionalId ?? "")?.fullName ?? "Chat";
  const headerPhotoUri = activeThread ? photoForThread(activeThread) : null;

  const messagePane = (
    <View style={[styles.chatLayout, { paddingBottom: bottomPad }]}>
      <View style={styles.chatCard}>
        <FlatList
          inverted
          data={listData}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContentInverted}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          maintainVisibleContentPosition={
            Platform.OS === "ios" ? { minIndexForVisible: 0, autoscrollToTopThreshold: 48 } : undefined
          }
          renderItem={({ item }) => {
            const outgoing = item.senderUserId === user?.id;
            return (
              <View style={[styles.bubbleRow, outgoing && styles.bubbleRowOutgoing]}>
                <View style={[styles.bubble, outgoing ? styles.outgoing : styles.incoming]}>
                  <Text style={[styles.body, outgoing && styles.bodyOutgoing]}>{item.body}</Text>
                  <Text style={styles.time}>{formatTime(item.createdAt, "es-AR")}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>{loading ? "Cargando…" : "No hay mensajes para mostrar."}</Text>
            </View>
          }
        />
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un mensaje"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            editable={Boolean(activeThreadId) && !sending}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              void send();
            }}
          />
          <Pressable
            style={[styles.send, (!draft.trim() || !activeThreadId || sending) && styles.sendDisabled]}
            onPress={() => {
              void send();
            }}
            disabled={!draft.trim() || !activeThreadId || sending}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
      {error && (isSplit ? activeThreadId : viewMode === "chat") ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  const inboxBody = (
    <View style={[styles.inboxWrap, isSplit && styles.inboxWrapSplit, { paddingBottom: isSplit ? 12 : bottomPad }]}>
      {loading ? (
        <View style={styles.inboxLoading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : inboxRows.length === 0 ? (
        <Text style={[styles.inboxEmpty, isSplit && styles.inboxEmptySplit]}>
          Todavía no tenés conversaciones. Cuando tengas profesionales asignados o turnos confirmados, van a aparecer acá
          para escribirles.
        </Text>
      ) : (
        <FlatList
          data={inboxRows}
          extraData={{ activeThreadId, isSplit }}
          keyExtractor={(row) => row.key}
          renderItem={renderInboxRow}
          contentContainerStyle={styles.inboxListContent}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={[styles.inboxSep, isSplit && styles.inboxSepSplit]} />}
        />
      )}
      {!isSplit && error && viewMode === "inbox" ? <Text style={styles.error}>{error}</Text> : null}
      {isSplit && error && !activeThreadId ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      {isSplit ? (
        <SafeAreaView style={styles.splitSafe} edges={["top", "left", "right"]}>
          <View style={styles.splitRow}>
            <View style={[styles.splitListCol, { width: leftPanelWidth }]}>
              <View style={styles.splitListHeader}>
                <Text style={styles.splitListTitle}>Chats</Text>
                <Text style={styles.splitListSub}>Tus conversaciones</Text>
              </View>
              {inboxBody}
            </View>
            <View style={styles.splitChatCol}>
              {activeThreadId ? (
                <>
                  <View style={styles.splitChatHeader}>
                    <PersonAvatar uri={headerPhotoUri} name={conversationTitle} size={42} />
                    <View style={styles.splitChatHeaderText}>
                      <Text style={styles.splitChatHeaderName} numberOfLines={1}>
                        {conversationTitle}
                      </Text>
                      <Text style={styles.splitChatHeaderSub} numberOfLines={1}>
                        Mensajes
                      </Text>
                    </View>
                  </View>
                  {messagePane}
                </>
              ) : (
                <View style={[styles.splitEmptyRight, { paddingBottom: bottomPad }]}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.textSubtle} />
                  <Text style={styles.splitEmptyTitle}>Seleccioná un chat</Text>
                  <Text style={styles.splitEmptySub}>Elegí una persona en la lista para ver la conversación.</Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      ) : (
        <Screen
          compact
          title={viewMode === "inbox" ? "Chat" : conversationTitle}
          subtitle={viewMode === "inbox" ? "Tus conversaciones" : undefined}
          leading={
            viewMode === "chat" ? (
              <Pressable
                onPress={goToInbox}
                hitSlop={12}
                style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Volver a la lista de chats"
              >
                <Ionicons name="chevron-back" size={28} color={colors.primary} />
              </Pressable>
            ) : undefined
          }
          scroll={false}
        >
          {viewMode === "inbox" ? inboxBody : messagePane}
        </Screen>
      )}
    </KeyboardAvoidingView>
  );
}
