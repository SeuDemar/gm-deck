"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import "../globals.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // Redireciona se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMessage(`Erro: ${error.message}`);
    else router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 font-sans bg-light">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl text-center text-brand">Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <p className="text-center font-medium text-brand-accent">
              {message}
            </p>
          )}

          <Input
            type="email"
            label="Email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Senha"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            onClick={handleLogin}
            variant="primary"
            className="w-full"
            size="lg"
          >
            Entrar
          </Button>

          <p className="mt-4 text-center text-brand">
            Não tem conta?{" "}
            <a
              href="/register"
              className="hover:underline text-brand-salmon"
            >
              Cadastre-se
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
