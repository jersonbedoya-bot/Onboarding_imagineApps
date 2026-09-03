"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/Field";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    setIsSubmitting(false);

    if (!result || result.error) {
      if (result?.code === "rate_limited") {
        setError("Demasiados intentos. Espera unos minutos y vuelve a intentar.");
        return;
      }
      // Mensaje genérico: nunca distinguimos "no existe" de "password incorrecta"
      // ni de "cuenta no activa" — esa distinción solo vive en los logs del servidor.
      setError("Credenciales inválidas o cuenta no activa.");
      return;
    }

    router.push("/");
  }

  return (
    <AuthShell title="Iniciar sesión" description="Ingresa con tu cuenta de Imagine Apps.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordInput
          id="password"
          name="password"
          label="Contraseña"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
    </AuthShell>
  );
}
