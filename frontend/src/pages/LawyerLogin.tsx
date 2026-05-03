import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password is required"),
});

export default function LawyerLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const profile = await login(parsed.data.email, parsed.data.password);
      if (profile?.role === "lawyer") {
        navigate("/lawyer-dashboard");
        return;
      }
      toast.error(
        "This email is a user account, not a lawyer. Use user login, or set role to lawyer in Supabase profiles for this user."
      );
      navigate("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not log in. Try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground">
              <Scale className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold">Lawyer Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">Access your lawyer dashboard</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in as Lawyer
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Not a lawyer?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">User Login</Link>
        </p>
      </Card>
    </div>
  );
}