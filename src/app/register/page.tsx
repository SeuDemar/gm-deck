"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, useToastContext } from "@/components/ui";
import "../globals.css";

export default function RegisterPage() {
  const { error: showError, success, warning } = useToastContext();
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();

    if (!nome.trim()) {
      warning("Por favor, preencha o nome");
      return;
    }

    if (password !== confirmPassword) {
      warning("As senhas não conferem");
      return;
    }

    if (password.length < 6) {
      warning("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: nome.trim(),
            apelido: apelido.trim() || null,
          },
        },
      });

      if (error) {
        showError(`Erro ao cadastrar: ${error.message}`);
      } else {
        success("Cadastro realizado com sucesso! Verifique seu e-mail.");
        // Limpa os campos após sucesso
        setNome("");
        setApelido("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      showError("Erro inesperado ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 font-sans bg-light">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img
                src="/dataset/Gm-deck-image.png"
                alt="GM Deck Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
            <CardTitle className="text-3xl text-center text-brand">Cadastro</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              type="text"
              label="Nome"
              placeholder="Digite seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              type="text"
              label="Apelido"
              placeholder="Digite seu apelido (opcional)"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              disabled={loading}
            />

            <Input
              type="email"
              label="Email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              type="password"
              label="Senha"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="A senha deve ter pelo menos 6 caracteres"
              required
              disabled={loading}
            />

            <Input
              type="password"
              label="Confirmar Senha"
              placeholder="Confirme sua senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              isLoading={loading}
              disabled={loading}
            >
              Cadastrar
            </Button>
          </form>

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
