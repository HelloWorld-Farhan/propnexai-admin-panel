import { prisma } from "@/lib/prisma";
import { getLowCreditThreshold } from "@/lib/credits";

export async function getDashboardStats() {
  const threshold = getLowCreditThreshold();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalInboundNumbers,
    totalOutboundNumbers,
    totalAiAgents,
    totalJobPostings,
    totalPartnerForms,
    totalDemoCalls,
    totalInfraCosts,
    activeCompanies,
    activeSubCompanies,
    lowCreditCount,
    lowCreditCompaniesData,
    todayCalls,
    todayInboundCalls,
    todayOutboundCalls,
    callStats,
    activePhoneNumbers,
    totalChannels,
    integrations,
    recentCalls,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.phoneNumber.count({ where: { status: "ACTIVE", direction: "INBOUND" } }),
    prisma.phoneNumber.count({ where: { status: "ACTIVE", direction: "OUTBOUND" } }),
    prisma.agentLibraryEntry.count(),
    prisma.jobPosting.count(),
    prisma.formSubmission.count({ where: { formType: "PARTNER_APP" } }),
    prisma.formSubmission.count({ where: { formType: "DEMO_CALL" } }),
    prisma.infraCostNotification.count(),
    prisma.company.count({ 
      where: { 
        status: "ACTIVE", 
        isDemo: false,
        OR: [
          { parentCompanyId: null },
          { parentCompanyId: { isSet: false } }
        ]
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
    prisma.creditBalance.findMany({
      where: {
        creditsRemaining: { lt: threshold },
        company: { isDemo: false, status: "ACTIVE" },
      },
      include: { company: { select: { name: true, parentCompanyId: true } } },
      orderBy: { creditsRemaining: "asc" },
      take: 20,
    }),
    prisma.callLog.count({
      where: {
        startedAt: { gte: startOfDay },
        company: { isDemo: false },
      },
    }),
    prisma.callLog.count({
      where: {
        startedAt: { gte: startOfDay },
        direction: "INBOUND",
        company: { isDemo: false },
      },
    }),
    prisma.callLog.count({
      where: {
        startedAt: { gte: startOfDay },
        direction: "OUTBOUND",
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
      take: 100,
      include: {
        company: { select: { name: true, parentCompany: { select: { name: true } } } },
        aiAgent: { select: { name: true } },
      },
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

  // Map low credit companies specifically
  const lowCreditCompanies = lowCreditCompaniesData.map(c => ({
    id: c.companyId,
    name: c.company.name,
    creditsRemaining: c.creditsRemaining,
    isSubCompany: !!c.company.parentCompanyId
  }));


  return {
    totalUsers,
    totalInboundNumbers,
    totalOutboundNumbers,
    totalAiAgents,
    totalJobPostings,
    totalPartnerForms,
    totalDemoCalls,
    totalInfraCosts,
    activeCompanies,
    activeSubCompanies,
    lowCreditCount,
    lowCreditCompanies,
    todayCalls,
    todayInboundCalls,
    todayOutboundCalls,
    avgCallDuration: Math.round(callStats._avg.durationSeconds ?? 0),
    successRate,
    activePhoneNumbers,
    totalChannels: totalChannels._sum.totalChannels ?? 0,
    connectedIntegrations: integrationMap.CONNECTED ?? 0,
    errorIntegrations: integrationMap.ERROR ?? 0,
    recentCalls,
  };
}
