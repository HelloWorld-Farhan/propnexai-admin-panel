import { prisma } from "@/lib/prisma";
import { getLowCreditThreshold } from "@/lib/credits";

export async function getDashboardStats() {
  const threshold = getLowCreditThreshold();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    activeCompanies,
    activeSubCompanies,
    lowCreditCount,
    todayCalls,
    callStats,
    activePhoneNumbers,
    totalChannels,
    integrations,
    recentCalls,
    recentCompanies,
    recentNumbers,
    recentCredits
  ] = await Promise.all([
    prisma.company.count({ 
      where: { 
        status: "ACTIVE", 
        isDemo: false,
        OR: [
          { parentCompanyId: null },
          { parentCompanyId: { isSet: false } }
        ],
        phoneNumbers: { some: {} } // Company must have an assigned number
      } 
    }),
    prisma.company.count({ 
      where: { 
        status: "ACTIVE", 
        isDemo: false,
        parentCompanyId: { isSet: true, not: null },
      } 
    }),
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
    prisma.company.findMany({
      where: { isDemo: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.phoneNumber.findMany({
      where: { company: { isDemo: false } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: { select: { name: true } } }
    }),
    prisma.creditUsage.findMany({
      where: { company: { isDemo: false } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: { select: { name: true } } }
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

  // Combine and format the custom recent events
  const combinedEvents = [
    ...recentCompanies.map(c => ({
      id: c.id,
      company: { name: c.name },
      type: "COMPANY_CREATED",
      title: "Company Registered",
      message: `A new company workspace was created for ${c.name}.`,
      createdAt: c.createdAt
    })),
    ...recentNumbers.map(n => ({
      id: n.id,
      company: { name: n.company?.name || "Unknown" },
      type: "NUMBER_ASSIGNED",
      title: "Number Assigned",
      message: `Phone number ${n.number} was assigned to ${n.company?.name || "Unknown"}.`,
      createdAt: n.createdAt
    })),
    ...recentCredits.map(c => ({
      id: c.id,
      company: { name: c.company?.name || "Unknown" },
      type: "CREDIT_GRANTED",
      title: "Credit Granted",
      message: `${c.amount} credits were given to ${c.company?.name || "Unknown"}.`,
      createdAt: c.createdAt
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10);

  return {
    activeCompanies, // This will now represent active parent companies
    activeSubCompanies,
    lowCreditCount,
    todayCalls,
    avgCallDuration: Math.round(callStats._avg.durationSeconds ?? 0),
    successRate,
    activePhoneNumbers,
    totalChannels: totalChannels._sum.totalChannels ?? 0,
    connectedIntegrations: integrationMap.CONNECTED ?? 0,
    errorIntegrations: integrationMap.ERROR ?? 0,
    recentCalls,
    recentEvents: combinedEvents
  };
}
