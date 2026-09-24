import { Metadata } from "next";
import WhiteLabelManager from "@/components/admin/white-label-manager";
import { AlertCircle, FileText, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "White Labeling | PropNex Admin",
  description: "Manage white-label domains and branding.",
};

export default function WhiteLabelPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">White Labeling</h2>
          <p className="text-muted-foreground mt-1">Configure and manage custom domains for clients.</p>
        </div>
        <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border border-border">
          <div className="text-right">
            <span className="font-semibold text-blue-400 flex items-center justify-end gap-1 text-sm"><Send className="h-3 w-3" /> Send to Domain Owner</span>
            <span className="text-xs text-muted-foreground">Client needs this for DNS</span>
          </div>
          <a href="https://drive.google.com/file/d/19KNdR7N_-f0EszbKkyQoxaqmKvZw-JCu/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-blue-600 text-white shadow hover:bg-blue-600/90 h-9 px-4 py-2 gap-2 whitespace-nowrap">
            <FileText className="h-4 w-4" />
            PDF Guide
          </a>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-5 flex gap-4 text-sm text-blue-200">
        <AlertCircle className="h-6 w-6 shrink-0 text-blue-400" />
        <div>
          <p className="font-semibold text-blue-100 text-base mb-1">Important: DNS Configuration for White-Label Domains</p>
          <p className="leading-relaxed">For any website to perfectly connect with our server, you must instruct the client (or configure it in GoDaddy, Hostinger, etc.) to add the following <strong>CNAME record</strong>. Please send the PDF Guide to the domain owner.</p>
          <p className="mt-3 font-mono text-sm bg-black/30 p-3 rounded-md w-fit text-blue-300 border border-blue-500/10 shadow-inner">
            Type: CNAME <br/>
            Host / Name: @ (or www)<br/>
            Value / Target: cname.propnexai.com
          </p>
        </div>
      </div>

      <WhiteLabelManager />
    </div>
  );
}
