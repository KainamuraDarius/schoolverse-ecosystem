import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export default function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const authMessage = (message: string) => {
    if (message === "Email not confirmed") {
      return "Your account exists, but you need to confirm your email before signing in.";
    }
    if (message.includes("weak and easy to guess")) {
      return "That password is too weak. Use a longer, less common password with mixed characters.";
    }
    if (message.includes("missing OAuth secret")) {
      return "Google sign-in is not configured in Supabase yet. Add the Google OAuth client ID and secret in your Supabase Auth provider settings.";
    }
    return message;
  };

  useEffect(() => {
    if (!loading && user) nav("/dashboard", { replace: true });
  }, [user, loading, nav]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(authMessage(error.message));
    else nav("/dashboard");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) toast.error(authMessage(error.message));
    else toast.success("Account created. Check your email and confirm it before signing in.");
  };

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setBusy(false);
      toast.error(authMessage(error.message || "Google sign-in failed"));
      return;
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setResending(false);
    if (error) {
      toast.error(authMessage(error.message));
      return;
    }
    toast.success("Confirmation email sent. Check your inbox and spam folder.");
  };

  return (
    <div className="min-h-screen bg-gradient-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 text-primary">
          <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">iSchoolVerse</span>
        </Link>

        <Card className="p-6 shadow-elevated border-border/60">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  If you already signed up, confirm your email before trying to sign in.
                </p>
                <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={handleResendConfirmation} disabled={busy || resending}>
                  {resending ? "Sending confirmation..." : "Resend confirmation email"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use a strong password. Common passwords are rejected by Supabase.
                </p>
                <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            Continue with Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
