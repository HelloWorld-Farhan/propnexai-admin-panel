import { Metadata } from "next";
import WhiteLabelManager from "@/components/admin/white-label-manager";

export const metadata: Metadata = {
  title: "White Labeling | PropNex Admin",
  description: "Manage white-label domains and branding.",
};

export default function WhiteLabelPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">White Labeling</h2>
      </div>
      <WhiteLabelManager />
    </div>
  );
}
