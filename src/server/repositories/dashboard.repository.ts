import { prisma } from "@/lib/prisma";
import { getLowCreditThreshold } from "@/lib/credits";

export async function getDashboardStats() {
  const threshold = getLowCreditThreshold();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    activeCompanies,
    lowCreditCount,
    todayCalls,
    callStats,
    activePhoneNumbers,
    totalChannels,
    integrations,
    recentCalls,
    recentEvents,
  ] = await Promise.all([
    prisma.company.count({ where: { status: "ACTIVE" } }),
    prisma.creditBalance.count({
      where: { creditsRemaining: { lt: threshold } },
    }),
    prisma.callLog.count({
      where: { startedAt: { gte: startOfDay } },
    }),
    prisma.callLog.aggregate({
      where: { startedAt: { gte: startOfDay } },
      _avg: { durationSeconds: true },
      _count: { _all: true },
    }),
    prisma.phoneNumber.count({ where: { status: "ACTIVE" } }),
    prisma.companySetupConfig.aggregate({ _sum: { totalChannels: true } }),
    prisma.integration.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.callLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        company: { select: { name: true } },
        aiAgent: { select: { name: true } },
      },
    }),
    prisma.systemEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: { select: { name: true } } },
    }),
  ]);

  const completedToday = await prisma.callLog.count({
    where: {
      startedAt: { gte: startOfDay },
      status: "COMPLETED",
    },
  });

  const successRate =
    todayCalls > 0 ? Math.round((completedToday / todayCalls) * 100) : 0;

  const integrationMap = Object.fromEntries(
    integrations.map((i) => [i.status, i._count._all]),
  );

  return {
    activeCompanies,
    lowCreditCount,
    todayCalls,
    avgCallDuration: Math.round(callStats._avg.durationSeconds ?? 0),
    successRate,
    activePhoneNumbers,
    totalChannels: totalChannels._sum.totalChannels ?? 0,
    connectedIntegrations: integrationMap.CONNECTED ?? 0,
    errorIntegrations: integrationMap.ERROR ?? 0,
    recentCalls,
    recentEvents,
  };
}
