import { DEMO_PASSWORD, DEMO_PERSONAS, useAuth } from "@ginja/auth";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  ToggleGroup,
  ToggleGroupItem
} from "@ginja/design-system";
import logoMarkUrl from "@ginja/design-system/assets/logo-mark";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [navigate, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await login({ email, password });

    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setError(result.error.message);
      setSubmitting(false);
    }
  }

  function fillPersona(personaEmail: string) {
    setEmail(personaEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-4xl gap-0 overflow-hidden rounded-md py-0 shadow-xl">
        <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)]">
          <CardHeader className="flex flex-col gap-6 bg-muted/60 p-6 text-center md:p-8 md:text-left">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex justify-center md:justify-start">
                <img
                  src={logoMarkUrl}
                  alt="Ginja AI"
                  className="h-auto w-24 max-w-full object-contain sm:w-28"
                />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle className="text-xl font-semibold tracking-normal text-foreground sm:text-2xl">
                  Workspace login
                </CardTitle>
                <CardDescription className="text-base/relaxed">
                  Select a demo persona to prefill credentials.
                </CardDescription>
              </div>
            </div>
            <ToggleGroup
              type="single"
              value={email}
              onValueChange={(value) => {
                if (value) {
                  fillPersona(value);
                }
              }}
              variant="outline"
              className="mt-auto flex w-full flex-wrap items-stretch"
              aria-label="Demo persona"
            >
              {DEMO_PERSONAS.map((persona) => (
                <ToggleGroupItem
                  key={persona.email}
                  value={persona.email}
                  aria-label={`Use ${persona.label}`}
                  className="min-w-0 flex-1 basis-36 bg-card px-3 text-center whitespace-normal hover:bg-accent data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {persona.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardHeader>
          <CardContent className="flex flex-col justify-center gap-6 p-6 sm:p-8">
            <form
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              <FieldGroup className="gap-4">
                <Field data-invalid={error ? "true" : undefined}>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    aria-invalid={error ? "true" : undefined}
                    className="h-9 bg-background"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>
                <Field data-invalid={error ? "true" : undefined}>
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    aria-invalid={error ? "true" : undefined}
                    className="h-9 bg-background"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <FieldError>{error}</FieldError>
                </Field>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <LoaderCircleIcon
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : null}
                  {submitting ? "Signing in" : "Sign in"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </div>
      </Card>
    </main>
  );
}
