import { Users, UserPlus, Shield, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  email?: string;
  role: "teacher" | "student";
  isOnline: boolean;
  joinedAt?: string;
  contributions?: number;
}

interface ParticipantsPanelProps {
  participants: Participant[];
  currentUserId?: string;
  onRemoveParticipant?: (id: string) => void;
  isTeacher?: boolean;
}

/**
 * Participants Panel Component
 * Shows all participants in the whiteboard session with their roles and status
 */
export function ParticipantsPanel({
  participants,
  currentUserId,
  onRemoveParticipant,
  isTeacher = false,
}: ParticipantsPanelProps) {
  const onlineCount = participants.filter((p) => p.isOnline).length;
  const teacherCount = participants.filter((p) => p.role === "teacher").length;

  return (
    <Card className="flex flex-col h-full bg-background/95 backdrop-blur border-primary/10">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Participants</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {onlineCount}/{participants.length}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-md bg-primary/5">
            <div className="text-muted-foreground">Online</div>
            <div className="font-bold text-primary">{onlineCount}</div>
          </div>
          <div className="p-2 rounded-md bg-blue-500/10">
            <div className="text-muted-foreground">Teachers</div>
            <div className="font-bold text-blue-500">{teacherCount}</div>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">No participants yet</p>
            </div>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md transition-colors",
                  participant.isOnline
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "bg-muted/30 opacity-60",
                  currentUserId === participant.id && "ring-2 ring-primary/50"
                )}
              >
                {/* Avatar */}
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {participant.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium truncate">
                      {participant.name}
                    </p>
                    {currentUserId === participant.id && (
                      <span className="text-xs text-primary font-semibold">
                        (You)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {participant.role === "teacher" ? (
                      <Shield className="h-3 w-3 text-blue-500" />
                    ) : null}
                    <p className="text-xs text-muted-foreground capitalize">
                      {participant.role}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      participant.isOnline
                        ? "bg-green-500"
                        : "bg-muted-foreground"
                    )}
                  />
                  {participant.contributions && (
                    <Badge variant="outline" className="text-xs px-1.5">
                      {participant.contributions}
                    </Badge>
                  )}
                </div>

                {/* Remove Button */}
                {isTeacher &&
                  currentUserId !== participant.id &&
                  onRemoveParticipant && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => onRemoveParticipant(participant.id)}
                    >
                      <LogOut className="h-3 w-3" />
                    </Button>
                  )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-3 border-t border-border/50 text-xs text-muted-foreground">
        {participants.length > 0 && (
          <p>
            {participants.filter((p) => p.isOnline).length} person
            {participants.filter((p) => p.isOnline).length !== 1 ? "s" : ""}{" "}
            online
          </p>
        )}
      </div>
    </Card>
  );
}
