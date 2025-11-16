"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import "../globals.css";

export default function RegisterPage() {
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister() {
    if (!nome.trim()) {
      setMessage("Por favor, preencha o nome ❌");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não conferem ❌");
      return;
    }

    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres ❌");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nome.trim(),
          apelido: apelido.trim() || null,
        },
      },
    });

    if (error) setMessage(`Erro: ${error.message}`);
    else setMessage("Cadastro realizado com sucesso ✅ Verifique seu e-mail.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 font-sans bg-light">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl text-center text-brand">Cadastro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <p className="text-center font-medium text-brand-accent">
              {message}
            </p>
          )}

          <Input
            type="text"
            label="Nome"
            placeholder="Digite seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          <Input
            type="text"
            label="Apelido"
            placeholder="Digite seu apelido (opcional)"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
          />

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
            helperText="A senha deve ter pelo menos 6 caracteres"
            required
          />

          <Input
            type="password"
            label="Confirmar Senha"
            placeholder="Confirme sua senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            onClick={handleRegister}
            variant="primary"
            className="w-full"
            size="lg"
          >
            Cadastrar
          </Button>

          <p className="mt-4 text-center text-brand">
            Já tem conta?{" "}
            <a
              href="/login"
              className="hover:underline text-brand-salmon"
            >
              Entrar
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
