import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const financeRepository = {
  findConfigByKey(key: string) {
    return prisma.systemConfig.findUnique({ where: { key } });
  },
  upsertConfigByKey(key: string, value: Prisma.InputJsonValue) {
    return prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  },
  findCompletedBookingIds() {
    return prisma.booking.findMany({
      where: { status: "COMPLETED" },
      select: { id: true },
      orderBy: { completedAt: "asc" }
    });
  },
  findBookingForFinance(bookingId: string) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        professional: { select: { sessionPriceUsd: true } }
      }
    });
  },
  findFirstCompletedBookingByPatient(patientId: string) {
    return prisma.booking.findFirst({
      where: { patientId, status: "COMPLETED" },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: { id: true }
    });
  },
  findLatestPurchaseByPatientUntil(patientId: string, until: Date) {
    return prisma.patientPackagePurchase.findMany({
      where: {
        patientId,
        purchasedAt: { lte: until }
      },
      include: {
        sessionPackage: {
          select: { id: true, currency: true, priceCents: true, credits: true }
        }
      },
      orderBy: { purchasedAt: "desc" },
      take: 1
    });
  },
  findPurchaseById(purchaseId: string) {
    return prisma.patientPackagePurchase.findUnique({
      where: { id: purchaseId },
      include: {
        sessionPackage: {
          select: { id: true, currency: true, priceCents: true, credits: true }
        }
      }
    });
  },
  deleteFinanceRecordByBooking(bookingId: string) {
    return prisma.financeSessionRecord.deleteMany({ where: { bookingId } });
  },
  upsertFinanceSessionRecord(data: Prisma.FinanceSessionRecordUncheckedCreateInput) {
    return prisma.financeSessionRecord.upsert({
      where: { bookingId: data.bookingId },
      update: data,
      create: data
    });
  },
  createOutboxEvent(eventType: string, aggregateType: string, aggregateId: string, payload: Prisma.InputJsonValue) {
    return prisma.outboxEvent.create({
      data: {
        eventType,
        aggregateType,
        aggregateId,
        payload
      }
    });
  }
};
