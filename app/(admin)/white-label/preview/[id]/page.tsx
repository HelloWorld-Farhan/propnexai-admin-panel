"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Copy, Globe, Building, Mail, Phone, Link as LinkIcon, Image as ImageIcon, User, Download } from "lucide-react";
import { toast } from "sonner";

export default function WhiteLabelPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomain();
  }, [id]);

  const fetchDomain = async () => {
    try {
      const res = await fetch(`/api/white-label/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => router.push("/white-label")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Domain details not found.</CardContent></Card>
      </div>
    );
  }

  let config = {};
  try {
    config = JSON.parse(data.pagesConfig || "{}");
  } catch (e) {}

  const userName = (config as any).userName || "Unknown";

  const FieldRow = ({ label, value, icon: Icon, isImage = false }: { label: string, value: string, icon: any, isImage?: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/20 border border-border rounded-lg gap-4 transition-all hover:bg-muted/30">
      <div className="flex items-center gap-3 flex-1">
        <div className="p-2 bg-muted/50 rounded-md"><Icon className="w-5 h-5 text-muted-foreground" /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 flex-1 w-full">
          <p className="text-sm font-medium text-muted-foreground min-w-[140px]">{label}</p>
          {isImage ? (
            value ? (
              <div className="mt-2 sm:mt-0 h-16 w-32 border border-border/50 rounded-md flex items-center justify-center bg-black/40 p-2 shadow-inner">
                <img src={value} alt={label} className="max-h-full max-w-full object-contain drop-shadow-md" />
              </div>
            ) : <p className="text-sm font-semibold text-muted-foreground italic mt-1 sm:mt-0">Not provided</p>
          ) : (
            <p className="text-sm font-semibold mt-1 sm:mt-0 break-all">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
          )}
        </div>
      </div>
      {value && (
        <div className="shrink-0">
          {isImage ? (
            <Button variant="outline" size="sm" onClick={() => {
              const a = document.createElement("a");
              a.href = value;
              a.download = `${label.replace(/\s+/g, "_").toLowerCase()}.png`;
              a.click();
            }} className="group border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500 text-cyan-400">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleCopy(value, label)} className="group border-border hover:bg-muted">
              <Copy className="w-4 h-4 mr-2 group-hover:text-blue-500" /> Copy
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="outline" onClick={() => router.push("/white-label")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to White Labeling
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Globe className="text-blue-500" />
            Submitted Details for {data.domain}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="User Name" value={userName} icon={User} />
          <FieldRow label="Domain Name" value={data.domain} icon={Globe} />
          <FieldRow label="Company Name" value={data.companyName} icon={Building} />
          <FieldRow label="Tab Title" value={data.tabTitle} icon={Building} />
          <FieldRow label="Support Email" value={data.supportEmail} icon={Mail} />
          <FieldRow label="Support Phone" value={data.supportPhone} icon={Phone} />
          <FieldRow label="Instagram URL" value={data.instagramUrl} icon={LinkIcon} />
          <FieldRow label="LinkedIn URL" value={data.linkedinUrl} icon={LinkIcon} />
          <FieldRow label="Main Logo URL" value={data.logoUrl} icon={ImageIcon} isImage={true} />
          <FieldRow label="Favicon URL" value={data.faviconUrl} icon={ImageIcon} isImage={true} />
        </CardContent>
      </Card>
    </div>
  );
}
