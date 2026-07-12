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
    prisma.company.count({ where: { status: "ACTIVE", isDemo: false } }),
    prisma.creditBalance.count({
      where: {
        creditsRemaining: { lt: threshold },
        company: { isDemo: false },
      },
    }),
    prisma.callLog.count({
      where: {
        startedAt: { gte: startOfDay },
        company: { isDemo: false },
      },
    }),
    prisma.callLog.aggregate({
      where: {
        startedAt: { gte: startOfDay },
        company: { isDemo: false },
      },
      _avg: { durationSeconds: true },
      _count: { _all: true },
    }),
    prisma.phoneNumber.count({
      where: { status: "ACTIVE", company: { isDemo: false } },
    }),
    prisma.companySetupConfig.aggregate({
      where: { company: { isDemo: false } },
      _sum: { totalChannels: true },
    }),
    prisma.integration.groupBy({
      by: ["status"],
      where: { company: { isDemo: false } },
      _count: { _all: true },
    }),
    prisma.callLog.findMany({
      where: { company: { isDemo: false } },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        company: { select: { name: true } },
        aiAgent: { select: { name: true } },
      },
    }),
    prisma.systemEvent.findMany({
      where: { company: { isDemo: false } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: { select: { name: true } } },
    }),
  ]);

  const completedToday = await prisma.callLog.count({
    where: {
      startedAt: { gte: startOfDay },
      status: "COMPLETED",
      company: { isDemo: false },
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
