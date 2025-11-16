"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Menu, LogOut } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { getFotoPerfilUrl } from "../../../lib/storageUtils";
import { Avatar, Button } from "@/components/ui";
import React from "react";

interface SidebarProps {
  onCriarSessao?: () => void;
  onEntrarSessao?: () => void;
  onEditarPerfil?: () => void;
  onVoltarDashboard?: () => void;
  customActions?: Array<{
    label: string;
    onClick: () => void;
    className?: string;
  }>;
  customContent?: React.ReactNode;
  showMobileButton?: boolean;
}

export default function Sidebar({
  onCriarSessao,
  onEntrarSessao,
  onEditarPerfil,
  onVoltarDashboard,
  customActions,
  customContent,
  showMobileButton = true,
}: SidebarProps) {
  const router = useRouter();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null
  );
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Verifica a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });

    // Escuta mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadFotoPerfil() {
      if (!user?.id) {
        setFotoPerfilUrl(null);
        return;
      }

      try {
        const url = await getFotoPerfilUrl(
          user.id,
          user.user_metadata?.foto_perfil_url
        );
        if (url) {
          setFotoPerfilUrl(url);
        } else {
          setFotoPerfilUrl(null);
        }
      } catch (error) {
        console.error("Erro ao carregar foto de perfil:", error);
        setFotoPerfilUrl(null);
      }
    }

    if (user?.id) {
      loadFotoPerfil();
    }
  }, [user?.id]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      router.push("/login");
    }
  }

  function handleActionClick(action: () => void) {
    action();
    setSidebarOpen(false);
  }

  return (
    <>
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static
          top-0 left-0
          w-72 sm:w-80 lg:w-64 h-full
          flex flex-col justify-between
          bg-brand text-primary
          z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          shadow-lg lg:shadow-none
        `}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header com botão de fechar (mobile) */}
          <div className="flex items-center justify-between p-4 border-b border-brand-light/20 lg:hidden">
            <h2 className="text-lg font-bold text-primary">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="p-2"
              aria-label="Fechar menu"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col p-4 lg:p-6">
            {/* Avatar e nome */}
            <div className="flex flex-col items-center mb-6 lg:mb-8 relative">
              <Avatar
                src={fotoPerfilUrl}
                name={user?.user_metadata?.full_name || user?.email || "Usuário"}
                size="lg"
                className="mb-3"
              />
              {/* Botão de logout próximo ao avatar - apenas no dashboard */}
              {!onVoltarDashboard && (
                <button
                  onClick={handleLogout}
                  className="absolute top-0 right-0 p-2 rounded-full bg-brand-light/30 hover:bg-brand-light/50 text-primary transition-all hover:shadow-md cursor-pointer"
                  title="Sair"
                  aria-label="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              <p className="text-center font-semibold text-primary text-sm lg:text-base break-words max-w-full px-2">
                {user?.user_metadata?.full_name || user?.email || "Usuário"}
              </p>
            </div>

            {/* Conteúdo customizado */}
            {customContent && (
              <div className="mb-4 w-full">
                {customContent}
              </div>
            )}

            {/* Navegação */}
            <nav className="flex flex-col gap-2 flex-1">
              {onVoltarDashboard && (
                <button
                  onClick={() => handleActionClick(() => router.push("/dashboard"))}
                  className="w-full px-4 py-3 rounded-lg transition-all bg-brand-light/20 text-primary hover:bg-brand-light/40 hover:shadow-md text-center font-semibold cursor-pointer border border-brand-light/30"
                >
                  Voltar ao Dashboard
                </button>
              )}
              {onCriarSessao && (
                <button
                  onClick={() => handleActionClick(onCriarSessao)}
                  className="w-full px-4 py-3 rounded-lg transition-all bg-transparent text-primary hover:bg-brand-light hover:shadow-md text-left font-medium cursor-pointer"
                >
                  Criar Sessão
                </button>
              )}
              {onEntrarSessao && (
                <button
                  onClick={() => handleActionClick(onEntrarSessao)}
                  className="w-full px-4 py-3 rounded-lg transition-all bg-transparent text-primary hover:bg-brand-light hover:shadow-md text-left font-medium cursor-pointer"
                >
                  Entrar em Sessão
                </button>
              )}
              {onEditarPerfil && (
                <button
                  onClick={() => handleActionClick(onEditarPerfil)}
                  className="w-full px-4 py-3 rounded-lg transition-all bg-transparent text-primary hover:bg-brand-light hover:shadow-md text-left font-medium cursor-pointer"
                >
                  Editar Perfil
                </button>
              )}
              {customActions?.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleActionClick(action.onClick)}
                  className={
                    action.className ||
                    "w-full px-4 py-3 rounded-lg transition-all bg-transparent text-primary hover:bg-brand-light hover:shadow-md text-left font-medium cursor-pointer"
                  }
                >
                  {action.label}
                </button>
              ))}
            </nav>
          </div>

        </div>
      </aside>

      {/* Botão para abrir sidebar no mobile */}
      {showMobileButton && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 shadow-lg"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </Button>
      )}
    </>
  );
}

