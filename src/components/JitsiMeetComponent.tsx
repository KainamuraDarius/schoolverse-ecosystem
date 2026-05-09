import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JitsiMeetProps {
  roomName: string;
  userName: string;
  onClose?: () => void;
  isMinimized?: boolean;
}

/**
 * Jitsi Meet Video Conference Component
 * Integrates Jitsi Meet API for real-time video lessons
 */
export function JitsiMeet({
  roomName,
  userName,
  onClose,
  isMinimized = false,
}: JitsiMeetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Jitsi Meet script
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (typeof (window as any).JitsiMeetExternalAPI === "undefined") return;

      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;

      const options = {
        roomName: roomName || "iSchoolVerse",
        parentNode: containerRef.current,
        height: 400,
        configOverwrite: {
          startAudioOnly: false,
          disableAudioLevels: true,
          startScreenSharing: false,
          toolbarButtons: [
            "microphone",
            "camera",
            "closedcaptions",
            "desktop",
            "fullscreen",
            "fodeviceselection",
            "hangup",
            "chat",
            "sharedvideo",
            "settings",
            "raisehand",
            "videoquality",
            "filmstrip",
            "stats",
            "shortcuts",
            "tileview",
            "select-background",
            "download",
          ],
        },
        interfaceConfigOverwrite: {
          DEFAULT_BACKGROUND: "#1a1a1a",
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          LANG_DETECTION: true,
          SHOW_DEEP_LINKING_IMAGE: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
          VERTICAL_FILMSTRIP: false,
        },
        userInfo: {
          displayName: userName,
        },
      };

      const api = new JitsiMeetExternalAPI("meet.jit.si", options);
      apiRef.current = api;

      // Event listeners
      api.addEventListener("videoConferenceJoined", () => {
        console.log("User joined the video conference");
      });

      api.addEventListener("videoConferenceLeft", () => {
        console.log("User left the video conference");
      });

      api.addEventListener("participantJoined", (participant: any) => {
        console.log("New participant joined:", participant);
      });

      api.addEventListener("participantLeft", (participant: any) => {
        console.log("Participant left:", participant);
      });

      return () => {
        if (apiRef.current) {
          apiRef.current.dispose();
        }
      };
    };

    return () => {
      document.body.removeChild(script);
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (e) {
          console.error("Error disposing Jitsi Meet API", e);
        }
      }
    };
  }, [roomName, userName]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 w-48 h-32 bg-black rounded-lg shadow-lg border border-primary/20 group hover:shadow-xl transition">
        <div
          ref={containerRef}
          className="w-full h-full rounded-lg overflow-hidden"
        />
        {onClose && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-lg">
      <div ref={containerRef} className="w-full h-full" />
      {onClose && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-4 right-4 z-50"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
