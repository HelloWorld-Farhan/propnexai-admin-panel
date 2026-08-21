export class NotificationService {
  private readonly gasUrl = process.env.GOOGLE_APPS_SCRIPT_URL || "";

  async sendCreditUpdateEmail(payload: {
    companyName: string;
    amount: number;
    newBalance: number;
    type: "TOP_UP" | "DEDUCTION";
  }) {
    if (!this.gasUrl) {
      console.warn("No GOOGLE_APPS_SCRIPT_URL configured. Skipping credit update email notification.");
      return;
    }

    try {
      const response = await fetch(this.gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "CREDIT_UPDATE",
          data: payload,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send GAS notification:", await response.text());
      }
    } catch (error) {
      console.error("Error sending GAS notification:", error);
    }
  }
  async sendCompanyBlockedEmail(payload: {
    companyName: string;
    ownerName: string;
    email: string;
    blockedUntil: string;
  }) {
    if (!this.gasUrl) {
      console.warn("No GOOGLE_APPS_SCRIPT_URL configured. Skipping company blocked email notification.");
      return;
    }

    try {
      const response = await fetch(this.gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "COMPANY_BLOCKED",
          data: payload,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send GAS notification:", await response.text());
      }
    } catch (error) {
      console.error("Error sending GAS notification:", error);
    }
  }
}

export const notificationService = new NotificationService();
