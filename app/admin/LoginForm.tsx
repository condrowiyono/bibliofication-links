"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-normal">I solemnly swear that I am up to no good.</CardTitle>
          <CardDescription>Enter the password to open the editor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus aria-invalid={!!state?.error} />
              {state?.error && (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              )}
            </div>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Checking…" : "Open the editor"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
