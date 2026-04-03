import { Platform, StyleSheet } from "react-native";
import type { AppThemeColors } from "../theme/colors";
import type { ThemeMode } from "../theme/ThemeContext";

export function buildChatStyles(c: AppThemeColors, mode: ThemeMode) {
  const hair = mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(60, 60, 67, 0.12)";
  const hair18 = mode === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(60, 60, 67, 0.18)";
  const chatWall = mode === "dark" ? "#0c1117" : "#ECE5DD";
  const outgoingBg = mode === "dark" ? "#166534" : "#DCF8C6";
  const outgoingText = mode === "dark" ? "#ECFDF5" : c.text;
  const composerBg = mode === "dark" ? c.surfacePressed : "#F0F2F5";
  const composerBorder = mode === "dark" ? c.border : "#D1D5DB";
  const rowPress = mode === "dark" ? "rgba(167, 139, 250, 0.12)" : "rgba(95, 68, 235, 0.06)";
  const rowSel = mode === "dark" ? "rgba(167, 139, 250, 0.18)" : "rgba(95, 68, 235, 0.1)";
  const headerBar = mode === "dark" ? c.surface : "#FAFAFC";

  return StyleSheet.create({
    keyboardRoot: {
      flex: 1
    },
    splitSafe: {
      flex: 1,
      backgroundColor: c.background
    },
    splitRow: {
      flex: 1,
      flexDirection: "row",
      minHeight: 0
    },
    splitListCol: {
      flexDirection: "column",
      backgroundColor: c.surface,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: hair18,
      minHeight: 0,
      alignSelf: "stretch"
    },
    splitListHeader: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hair
    },
    splitListTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.5
    },
    splitListSub: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textMuted,
      marginTop: 2
    },
    splitChatCol: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      backgroundColor: c.background,
      flexDirection: "column"
    },
    splitChatHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hair,
      backgroundColor: headerBar
    },
    splitChatHeaderText: {
      flex: 1,
      minWidth: 0,
      gap: 2
    },
    splitChatHeaderName: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.3
    },
    splitChatHeaderSub: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSubtle
    },
    splitEmptyRight: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      gap: 8
    },
    splitEmptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text
    },
    splitEmptySub: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 20
    },
    inboxWrap: {
      flex: 1,
      minHeight: 0,
      marginHorizontal: -4
    },
    inboxWrapSplit: {
      marginHorizontal: 0
    },
    inboxLoading: {
      paddingVertical: 40,
      alignItems: "center",
      justifyContent: "center"
    },
    inboxEmpty: {
      fontSize: 15,
      color: c.textMuted,
      lineHeight: 22,
      textAlign: "center",
      paddingVertical: 24,
      paddingHorizontal: 8
    },
    inboxEmptySplit: {
      fontSize: 13,
      lineHeight: 19,
      paddingHorizontal: 12
    },
    inboxListContent: {
      paddingBottom: 8
    },
    inboxSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hair,
      marginLeft: 68
    },
    inboxSepSplit: {
      marginLeft: 56
    },
    inboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4
    },
    inboxRowPressed: {
      opacity: 0.92,
      backgroundColor: rowPress
    },
    inboxRowSplit: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 10
    },
    inboxRowSelected: {
      backgroundColor: rowSel
    },
    inboxRowBody: {
      flex: 1,
      minWidth: 0,
      gap: 4
    },
    inboxRowTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    },
    inboxRowBottom: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8
    },
    inboxName: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.2,
      flex: 1,
      minWidth: 0
    },
    inboxNameSplit: {
      fontSize: 15
    },
    inboxTime: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSubtle,
      fontVariant: ["tabular-nums"]
    },
    inboxPreview: {
      flex: 1,
      fontSize: 14,
      color: c.textMuted,
      lineHeight: 18
    },
    inboxPreviewSplit: {
      fontSize: 13,
      lineHeight: 17
    },
    inboxUnreadDot: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.success,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6
    },
    inboxUnreadText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800"
    },
    inboxPendingHint: {
      fontSize: 13,
      color: c.primary,
      fontWeight: "600"
    },
    inboxPendingHintSplit: {
      fontSize: 12
    },
    backBtn: {
      marginLeft: -6
    },
    backBtnPressed: {
      opacity: 0.7
    },
    chatLayout: {
      flex: 1,
      minHeight: 0
    },
    messagesList: {
      flex: 1,
      minHeight: 0
    },
    chatCard: {
      flex: 1,
      minHeight: 120,
      borderRadius: 16,
      backgroundColor: chatWall,
      overflow: "hidden"
    },
    messagesContentInverted: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexGrow: 1,
      gap: 8
    },
    bubbleRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-start"
    },
    bubbleRowOutgoing: {
      justifyContent: "flex-end"
    },
    bubble: {
      maxWidth: "82%",
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 8,
      gap: 3
    },
    incoming: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 4
    },
    outgoing: {
      backgroundColor: outgoingBg,
      borderTopRightRadius: 4
    },
    body: {
      color: c.text,
      fontSize: 15,
      lineHeight: 20
    },
    bodyOutgoing: {
      color: outgoingText
    },
    time: {
      color: c.textSubtle,
      fontSize: 11,
      alignSelf: "flex-end"
    },
    composer: {
      flexShrink: 0,
      borderTopWidth: 1,
      borderTopColor: composerBorder,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-end",
      backgroundColor: composerBg
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      borderRadius: 20,
      borderWidth: 0,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingTop: Platform.OS === "ios" ? 10 : 8,
      paddingBottom: Platform.OS === "ios" ? 10 : 8,
      fontSize: 16,
      color: c.text
    },
    send: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: "#25D366",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2
    },
    sendDisabled: {
      backgroundColor: mode === "dark" ? "#475569" : "#A9B2BB"
    },
    error: {
      color: c.danger,
      fontWeight: "600",
      marginTop: 6
    },
    emptyWrap: {
      flexGrow: 1,
      minHeight: 200,
      transform: [{ scaleY: -1 }],
      alignItems: "center",
      justifyContent: "center"
    },
    empty: {
      color: c.textMuted
    }
  });
}
