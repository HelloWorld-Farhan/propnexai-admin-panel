function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var type = payload.type; 

    if (type === "new_registration") {
      var adminEmail = "support@propnexai.com"; 
      var userName = payload.name || "New User";
      var userEmail = payload.email || "No Email Provided";
      var date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      // 1. Send Email to ADMIN
      var adminSubject = "New User Registration - Propnex AI";
      var adminHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .content p { margin-top: 0; margin-bottom: 20px; }
            .details { background-color: #18181b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #27272a; }
            .details div { margin-bottom: 8px; color: #fafafa; }
            .details div:last-child { margin-bottom: 0; }
            .details strong { display: inline-block; width: 100px; color: #a1a1aa; }
            .button-container { text-align: center; margin-top: 32px; }
            .button { display: inline-block; background-color: #fafafa; color: #09090b !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; }
            .footer { padding: 24px; text-align: center; font-size: 14px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Propnex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello Admin,</p>
              <p>A new user has just registered on the Propnex AI platform and is waiting for their company workspace to be created.</p>
              <div class="details">
                <div><strong>Name:</strong> ${userName}</div>
                <div><strong>Email:</strong> ${userEmail}</div>
                <div><strong>Date:</strong> ${date}</div>
                <div><strong>Time:</strong> ${time}</div>
              </div>
              <p>To approve this user, please log into the Admin Panel and create a Company profile for them.</p>
              <div class="button-container">
                <a href="http://localhost:3003/login" class="button">Log in to Admin Panel</a>
              </div>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} Propnex AI. All rights reserved.</div>
          </div>
        </body>
        </html>
      `;
      MailApp.sendEmail({ to: adminEmail, subject: adminSubject, htmlBody: adminHtml, name: "Propnex AI Support", replyTo: "support@propnexai.com" });

      // 2. Send Thank You Email to USER
      if (userEmail && userEmail !== "No Email Provided") {
        var userSubject = "Thank you for signing up - Propnex AI";
        var userHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
              .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
              .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
              .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
              .content p { margin-top: 0; margin-bottom: 20px; }
              .footer { padding: 24px; text-align: center; font-size: 14px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h1>Propnex AI</h1></div>
              <div class="content">
                <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello ${userName},</p>
                <p>Thank you for signing up for Propnex AI!</p>
                <p>Your account has been successfully created and is currently under review by our administrative team. <strong>Please wait for your account to be approved.</strong></p>
                <p>Once we approve your account, you will receive an email and you will be able to access everything on the platform.</p>
              </div>
              <div class="footer">&copy; ${new Date().getFullYear()} Propnex AI. All rights reserved.</div>
            </div>
          </body>
          </html>
        `;
        MailApp.sendEmail({ to: userEmail, subject: userSubject, htmlBody: userHtml, name: "Propnex AI Support", replyTo: "support@propnexai.com" });
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Registration emails sent" })).setMimeType(ContentService.MimeType.JSON);

    } else if (type === "company_created") {
      // 3. Send Email to USER (Approval)
      var userEmail = payload.email;
      var userName = payload.name || "User";
      var companyName = payload.companyName || "Your Workspace";
      var assignedNumber = payload.assignedNumber; 
      if (!userEmail) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing user email" })).setMimeType(ContentService.MimeType.JSON);

      var subject = "Your Account has been Approved - Propnex AI";
      var numberHtml = assignedNumber 
        ? `<div style="margin-top: 16px; padding: 12px; background: #052e16; border: 1px solid #166534; border-radius: 8px;"><strong>Assigned Phone Number:</strong> <span style="color: #4ade80;">${assignedNumber}</span></div>` : ``;
      
      var htmlBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .content p { margin-top: 0; margin-bottom: 20px; }
            .details { background-color: #18181b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #27272a; }
            .details div { margin-bottom: 8px; color: #fafafa; }
            .details div:last-child { margin-bottom: 0; }
            .details strong { display: inline-block; width: 120px; color: #a1a1aa; }
            .button-container { text-align: center; margin-top: 32px; }
            .button { display: inline-block; background-color: #fafafa; color: #09090b !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; }
            .footer { padding: 24px; text-align: center; font-size: 14px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Propnex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello ${userName},</p>
              <p>Great news! Your account has been officially approved and your Propnex AI workspace has been created.</p>
              <div class="details">
                <div><strong>Workspace:</strong> ${companyName}</div>
                <div><strong>Status:</strong> <span style="color: #10b981;">Active</span></div>
                ${numberHtml}
              </div>
              <p>You can now log into your dashboard to access everything on the platform!</p>
              <div class="button-container">
                <a href="http://localhost:3000/auth/sign-in" class="button">Log in to Dashboard</a>
              </div>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} Propnex AI. All rights reserved.</div>
          </div>
        </body>
        </html>
      `;
      MailApp.sendEmail({ to: userEmail, subject: subject, htmlBody: htmlBody, name: "Propnex AI Support", replyTo: "support@propnexai.com" });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Acceptance email sent" })).setMimeType(ContentService.MimeType.JSON);

    } else if (type === "number_assigned") {
      // 4. Send Email to USER (Number Assigned Later)
      var userEmail = payload.email;
      var userName = payload.name || "User";
      var assignedNumber = payload.assignedNumber;
      if (!userEmail || !assignedNumber) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing info" })).setMimeType(ContentService.MimeType.JSON);

      var subject = "Your Phone Number is Ready - Propnex AI";
      var htmlBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .content p { margin-top: 0; margin-bottom: 20px; }
            .details { background-color: #18181b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #27272a; }
            .details div { margin-bottom: 8px; color: #fafafa; }
            .details div:last-child { margin-bottom: 0; }
            .details strong { display: inline-block; width: 120px; color: #a1a1aa; }
            .button-container { text-align: center; margin-top: 32px; }
            .button { display: inline-block; background-color: #fafafa; color: #09090b !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; }
            .footer { padding: 24px; text-align: center; font-size: 14px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Propnex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello ${userName},</p>
              <p>Your requested service phone number has just been assigned to your workspace by our admin team!</p>
              <div class="details">
                <div><strong>Assigned Number:</strong> <span style="color: #4ade80; font-weight: bold;">${assignedNumber}</span></div>
                <div><strong>Status:</strong> <span style="color: #10b981;">Ready</span></div>
              </div>
              <p>You can now make and receive calls on your dashboard. The warning banner has automatically been removed from your dashboard.</p>
              <div class="button-container">
                <a href="http://localhost:3000/auth/sign-in" class="button">Log in to Dashboard</a>
              </div>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} Propnex AI. All rights reserved.</div>
          </div>
        </body>
        </html>
      `;
      MailApp.sendEmail({ to: userEmail, subject: subject, htmlBody: htmlBody, name: "Propnex AI Support", replyTo: "support@propnexai.com" });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Number assignment email sent" })).setMimeType(ContentService.MimeType.JSON);

    } else if (type === "user_rejected") {
      // 5. Send Rejection Email to USER
      var userEmail = payload.email;
      var userName = payload.name || "User";
      if (!userEmail) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing user email" })).setMimeType(ContentService.MimeType.JSON);

      var subject = "Update Regarding Your Account Request - Propnex AI";
      var htmlBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .content p { margin-top: 0; margin-bottom: 20px; }
            .footer { padding: 24px; text-align: center; font-size: 14px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Propnex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello ${userName},</p>
              <p>Thank you for your interest in Propnex AI.</p>
              <p>We are writing to inform you that, unfortunately, your account request has been declined at this time. We are currently limiting access to ensure the best experience for our early users.</p>
              <p><strong>Please note that you will be able to reapply for an account after a 6-month period.</strong></p>
              <p>If you have any questions, please reply directly to this email and our support team will be happy to assist you.</p>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} Propnex AI. All rights reserved.</div>
          </div>
        </body>
        </html>
      `;
      MailApp.sendEmail({ to: userEmail, subject: subject, htmlBody: htmlBody, name: "Propnex AI Support", replyTo: "support@propnexai.com" });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Rejection email sent" })).setMimeType(ContentService.MimeType.JSON);

    } else if (type === "reminder_approval") {
      // 6. Reminder for account approval
      var adminEmail = "support@propnexai.com"; 
      var userName = payload.name || "User";
      var userEmail = payload.email || "No Email Provided";

      var adminSubject = "Reminder: Account Pending Approval - Propnex AI";
      var adminHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .details { background-color: #18181b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #27272a; }
            .details div { margin-bottom: 8px; color: #fafafa; }
            .details strong { display: inline-block; width: 100px; color: #a1a1aa; }
            .button-container { text-align: center; margin-top: 32px; }
            .button { display: inline-block; background-color: #fafafa; color: #09090b !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Propnex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello Admin,</p>
              <p>A user is waiting for their account to be approved. They have requested a reminder to speed up the process.</p>
              <div class="details">
                <div><strong>Name:</strong> ${userName}</div>
                <div><strong>Email:</strong> ${userEmail}</div>
              </div>
              <p>Please log into the Admin Panel to create a Company profile for them.</p>
              <div class="button-container">
                <a href="http://localhost:3003/login" class="button">Log in to Admin Panel</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      MailApp.sendEmail({ to: adminEmail, subject: adminSubject, htmlBody: adminHtml, name: "Propnex AI Support", replyTo: "support@propnexai.com" });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Approval reminder sent" })).setMimeType(ContentService.MimeType.JSON);

    } else if (type === "reminder_number") {
      // 7. Reminder for phone number assignment
      var adminEmail = "support@propnexai.com"; 
      var userName = payload.name || "User";
      var userEmail = payload.email || "No Email Provided";

      var adminSubject = "Reminder: Phone Number Assignment Required - Propnex AI";
      var adminHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .details { background-color: #18181b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #27272a; }
            .details div { margin-bottom: 8px; color: #fafafa; }
            .details strong { display: inline-block; width: 100px; color: #a1a1aa; }
            .button-container { text-align: center; margin-top: 32px; }
            .button { display: inline-block; background-color: #fafafa; color: #09090b !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Propnex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello Admin,</p>
              <p>A user is waiting for a phone number to be assigned to their workspace. They have clicked the 'Remind Admin' button to notify you.</p>
              <div class="details">
                <div><strong>Name:</strong> ${userName}</div>
                <div><strong>Email:</strong> ${userEmail}</div>
              </div>
              <p>Please log into the Admin Panel, find their company, and assign a phone number.</p>
              <div class="button-container">
                <a href="http://localhost:3003/login" class="button">Log in to Admin Panel</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      MailApp.sendEmail({ to: adminEmail, subject: adminSubject, htmlBody: adminHtml, name: "Propnex AI Support", replyTo: "support@propnexai.com" });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Number reminder sent" })).setMimeType(ContentService.MimeType.JSON);

    } else if (type === "user_deleted") {
      // 8. User deleted by Admin (Start fresh email)
      var userEmail = payload.email;
      var userName = payload.name || "User";
      if (!userEmail) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing user email" })).setMimeType(ContentService.MimeType.JSON);

      var subject = "Your Account has been Deleted - Propnex AI";
      var htmlBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000000; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #09090b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; }
            .header { background-color: #09090b; padding: 24px; text-align: center; color: #fafafa; border-bottom: 1px solid #27272a; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .content { padding: 32px; color: #a1a1aa; line-height: 1.6; }
            .content p { margin-top: 0; margin-bottom: 20px; }
            .footer { padding: 24px; text-align: center; font-size: 14px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Propnex AI</h1></div>
            <div class="content">
              <p style="color: #fafafa; font-size: 18px; font-weight: 500;">Hello ${userName},</p>
              <p>We are writing to inform you that your Propnex AI workspace and user account have been removed by our administrative team.</p>
              <p>Your email address has been completely cleared from our database. If you wish to use Propnex AI in the future, you are free to <strong>start completely fresh</strong> by signing up again with this email address.</p>
              <p>If you have any questions or believe this was an error, please reply directly to this email and our support team will be happy to assist you.</p>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} Propnex AI. All rights reserved.</div>
          </div>
        </body>
        </html>
      `;
      MailApp.sendEmail({ to: userEmail, subject: subject, htmlBody: htmlBody, name: "Propnex AI Support", replyTo: "support@propnexai.com" });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Account deleted email sent" })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid type provided" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
