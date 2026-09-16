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
    recentCompanies,
    recentNumbers,
    recentCredits,
    recentAgents,
    recentJobs,
    recentForms
  ] = await Promise.all([
    prisma.user.count(),
    prisma.phoneNumber.count({ where: { status: "ACTIVE", direction: "INBOUND" } }),
    prisma.phoneNumber.count({ where: { status: "ACTIVE", direction: "OUTBOUND" } }),
    prisma.aiAgent.count(),
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
      take: 10,
      include: {
        company: { select: { name: true, parentCompany: { select: { name: true } } } },
        aiAgent: { select: { name: true } },
      },
    }),
    prisma.company.findMany({
      where: { isDemo: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { parentCompany: { select: { name: true } } }
    }),
    prisma.phoneNumber.findMany({
      where: { company: { isDemo: false } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: { select: { name: true, parentCompany: { select: { name: true } } } } }
    }),
    prisma.creditUsage.findMany({
      where: { company: { isDemo: false } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { company: { select: { name: true, parentCompany: { select: { name: true } } } } }
    }),
    prisma.aiAgent.findMany({
      where: { company: { isDemo: false } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { company: { select: { name: true, parentCompany: { select: { name: true } } } } }
    }),
    prisma.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.supportRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { company: { select: { name: true, parentCompany: { select: { name: true } } } } }
    })
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

  // Combine and format the custom recent events (Map to parent company if exists)
  const combinedEvents = [
    ...recentCompanies.map(c => ({
      id: c.id,
      company: { name: c.parentCompany?.name || c.name },
      type: "COMPANY_CREATED",
      title: "Company Registered",
      message: `A new company workspace was created for ${c.parentCompany?.name || c.name}.`,
      createdAt: c.createdAt
    })),
    ...recentNumbers.map(n => ({
      id: n.id,
      company: { name: n.company?.parentCompany?.name || n.company?.name || "Unknown" },
      type: "NUMBER_ASSIGNED",
      title: "Number Assigned",
      message: `Phone number ${n.number} was assigned to ${n.company?.parentCompany?.name || n.company?.name || "Unknown"}.`,
      createdAt: n.createdAt
    })),
    ...recentCredits.map(c => ({
      id: c.id,
      company: { name: c.company?.parentCompany?.name || c.company?.name || "Unknown" },
      type: "CREDIT_EDITED",
      title: "Credit Balance Update",
      message: `${c.amount} credits were modified for ${c.company?.parentCompany?.name || c.company?.name || "Unknown"} (${c.reason}).`,
      createdAt: c.createdAt
    })),
    ...recentAgents.map(a => ({
      id: a.id,
      company: { name: a.company?.parentCompany?.name || a.company?.name || "Unknown" },
      type: "AGENT_CREATED",
      title: "New AI Agent",
      message: `Agent Library: ${a.name} was created for ${a.company?.parentCompany?.name || a.company?.name || "Unknown"}.`,
      createdAt: a.createdAt
    })),
    ...recentJobs.map(j => ({
      id: j.id,
      company: { name: "System" },
      type: "JOB_POSTED",
      title: "Job Notification",
      message: `A new job was posted: ${j.title}.`,
      createdAt: j.createdAt
    })),
    ...recentForms.map(f => ({
      id: f.id,
      company: { name: f.company?.parentCompany?.name || f.company?.name || "System" },
      type: "FORM_INFO",
      title: "Form Request Submitted",
      message: `Form info submitted by ${f.name} regarding ${f.reason}.`,
      createdAt: f.createdAt
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 15);

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
    recentEvents: combinedEvents
  };
}
