import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_KEY = "mc:onboarding-trial-booking:v1";
const PENDING_TTL_MS = 48 * 60 * 60 * 1000;

export type PendingTrialBooking = {
  professionalId: string;
  slot: {
    id: string;
    startsAt: string;
    endsAt: string;
  };
  paymentId: string;
  orderId?: string;
  holdId?: string;
  savedAt: number;
};

export async function writePendingTrialBooking(
  pending: Omit<PendingTrialBooking, "savedAt">
): Promise<void> {
  const durable: PendingTrialBooking = { ...pending, savedAt: Date.now() };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(durable));
}

export async function readPendingTrialBooking(): Promise<PendingTrialBooking | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingTrialBooking;
    if (!parsed?.paymentId || !parsed.professionalId || !parsed.slot?.startsAt) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return null;
    }
    if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > PENDING_TTL_MS) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingTrialBooking(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}
