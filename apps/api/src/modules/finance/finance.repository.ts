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
      select: {
        id: true,
        patientId: true,
        professionalId: true,
        consumedPurchaseId: true,
        consumedCredits: true,
        status: true,
        completedAt: true,
        startsAt: true,
        endsAt: true
      }
    });
  },
  findTrialCheckoutForBooking(booking: {
    id: string;
    patientId: string;
    professionalId: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    return prisma.paymentCheckout.findFirst({
      where: {
        kind: "TRIAL",
        status: { in: ["PAID", "FULFILLED"] },
        OR: [
          { fulfillmentBookingId: booking.id },
          {
            patientId: booking.patientId,
            trialProfessionalId: booking.professionalId,
            trialStartsAt: booking.startsAt,
            trialEndsAt: booking.endsAt
          }
        ]
      },
      orderBy: [{ fulfilledAt: "desc" }, { paidAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        chargeAmountMajor: true,
        chargeCurrency: true,
        displayName: true,
        fulfillmentBookingId: true,
        metadata: true
      }
    });
  },
  findPurchaseById(purchaseId: string) {
    return prisma.patientPackagePurchase.findUnique({
      where: { id: purchaseId },
      include: {
        sessionPackage: {
          select: { id: true, name: true, currency: true, priceCents: true, credits: true }
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
