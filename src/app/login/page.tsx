"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Button, Input, Card, CardHeader, CardContent, useToastContext } from "@/components/ui";
import "../globals.css";

export default function LoginPage() {
  const router = useRouter();
  const { error: showError, success, info } = useToastContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Redireciona se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    
    if (!email.trim()) {
      showError("Por favor, preencha o email");
      return;
    }

    if (!password.trim()) {
      showError("Por favor, preencha a senha");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        showError(`Erro ao fazer login: ${error.message}`);
      } else {
        success("Login realizado com sucesso!");
        router.push("/dashboard");
      }
    } catch (error) {
      showError("Erro inesperado ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e?: React.FormEvent) {
    e?.preventDefault();
    
    if (!email.trim()) {
      showError("Por favor, preencha o email para recuperar a senha");
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        showError(`Erro ao enviar email: ${error.message}`);
      } else {
        success("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setShowForgotPassword(false);
      }
    } catch (error) {
      showError("Erro inesperado. Tente novamente.");
    } finally {
      setForgotPasswordLoading(false);
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
            <h1 className="text-2xl font-bold text-brand">Bem vindo do Login do Gm-deck</h1>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showForgotPassword ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
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
                  Entrar
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-brand hover:underline"
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>

              <p className="mt-4 text-center text-brand">
                Não tem conta?{" "}
                <a
                  href="/register"
                  className="hover:underline text-brand-salmon"
                >
                  Cadastre-se
                </a>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Digite seu email e enviaremos um link para redefinir sua senha.
                </p>

                <Input
                  type="email"
                  label="Email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={forgotPasswordLoading}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  size="lg"
                  isLoading={forgotPasswordLoading}
                  disabled={forgotPasswordLoading}
                >
                  Enviar Email de Recuperação
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setEmail("");
                  }}
                  className="text-sm text-brand hover:underline"
                  disabled={forgotPasswordLoading}
                >
                  Voltar ao login
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
