import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  tagline: string;
  icon: LucideIcon;
  features: string[];
};

export default function ModulePlaceholder({ title, tagline, icon: Icon, features }: Props) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft shrink-0">
          <Icon className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">{tagline}</p>
        </div>
      </div>

      <Card className="p-6 border-border/60">
        <h2 className="font-display font-semibold text-foreground mb-4">Planned features</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/80">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6 border-dashed border-border bg-secondary/40">
        <p className="text-sm text-muted-foreground">
          This module is part of the iSchoolVerse roadmap. Tell Lovable which feature to build first and we'll bring it to life.
        </p>
      </Card>
    </div>
  );
}
