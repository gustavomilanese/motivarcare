import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getMyProfile } from "../api/client";
import type { ProfessionalProfile } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";
import { PersonAvatar } from "../components/PersonAvatar";
import { Screen } from "../components/Screen";
import { StackHeader } from "../components/StackHeader";
import type { ProRootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

export function ProfileScreen() {
  const { user, token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProRootStackParamList>>();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      setLoading(true);
      void getMyProfile(token)
        .then((response) => setProfile(response.profile))
        .finally(() => setLoading(false));
    }, [token])
  );

  return (
    <Screen>
      <StackHeader title="Mi perfil" onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      <ScrollView contentContainerStyle={styles.list}>
        <Card style={styles.hero}>
          <PersonAvatar uri={profile?.photoUrl ?? user?.avatarUrl} name={profile?.fullName ?? user?.fullName ?? ""} size={72} />
          <Text style={styles.name}>{profile?.fullName ?? user?.fullName}</Text>
          <Text style={styles.meta}>{profile?.professionalTitle || "Profesional"}</Text>
          <Text style={styles.meta}>{profile?.email ?? user?.email}</Text>
        </Card>
        {profile?.bio ? (
          <Card>
            <Text style={styles.kicker}>Presentación</Text>
            <Text style={styles.body}>{profile.bio}</Text>
          </Card>
        ) : null}
        <Card>
          <Row label="Especialización" value={profile?.specialization || "—"} />
          <Row label="Zona horaria" value={profile?.timezone || "—"} />
          <Row label="Anticipación" value={`${profile?.cancellationHours ?? 24} h`} />
          <Row label="Valor USD" value={profile?.sessionPriceUsd ? String(profile.sessionPriceUsd) : "—"} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.meta}>{props.label}</Text>
      <Text style={styles.value}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32, gap: 12 },
  hero: { alignItems: "center", gap: 8 },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  meta: { color: colors.muted, fontSize: 13 },
  kicker: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  value: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 }
});
