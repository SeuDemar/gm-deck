"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "pdfjs-dist/web/pdf_viewer.css";

interface Props {
  pdfUrl: string;
  onValues?: (values: Record<string, string>) => void;
  initialValues?: Record<string, string>; // Valores iniciais para popular os campos
  readOnly?: boolean; // Se true, desabilita edição dos campos
  isVisible?: boolean; // Se false, não inicializa o PDF (útil para modais)
}

export interface PdfJsViewerRef {
  collectValues: () => Record<string, string>;
}

const PdfJsViewer = React.forwardRef<PdfJsViewerRef, Props>(
  (
    {
      pdfUrl,
      onValues,
      initialValues,
      readOnly = false,
      isVisible = true, // Por padrão assume que está visível
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfViewerRef = useRef<{ setDocument: (pdf: any) => void } | null>(
      null
    );
    const [pdfLoaded, setPdfLoaded] = useState(false);

    // Usa ref para onValues para evitar re-renders desnecessários
    const onValuesRef = useRef(onValues);
    useEffect(() => {
      onValuesRef.current = onValues;
    }, [onValues]);

    // Usa ref para initialValues para poder acessar dentro do useEffect sem recriar a função
    const initialValuesRef = useRef(initialValues);
    useEffect(() => {
      initialValuesRef.current = initialValues;
    }, [initialValues]);

    const collectFieldValues = useCallback(() => {
      const container = containerRef.current;
      if (!container) {
        return {};
      }

      const values: Record<string, string> = {};

      // Busca campos em qualquer lugar do container
      // O PDF.js cria campos dentro do viewer, então precisamos buscar em todo o container
      const inputs = container.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select");

      inputs.forEach((el) => {
        const name = el.getAttribute("name");
        if (!name) {
          return;
        }

        let value: string;
        if (
          el instanceof HTMLInputElement &&
          (el.type === "checkbox" || el.type === "radio")
        ) {
          value = el.checked ? el.value || "on" : "";
        } else {
          value = el.value ?? "";
        }

        values[name] = value;
      });

      // Usa ref em vez de onValues diretamente
      onValuesRef.current?.(values);
      return values;
    }, []);

    // Expõe a função collectFieldValues via ref
    React.useImperativeHandle(
      ref,
      () => ({
        collectValues: () => {
          return collectFieldValues();
        },
      }),
      [collectFieldValues]
    );

    // Função auxiliar para verificar se o container tem dimensões válidas
    const hasValidDimensions = useCallback(
      (element: HTMLElement | null): boolean => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        // Verifica se tem dimensões válidas E se está visível (não está com display: none)
        const style = window.getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      },
      []
    );

    useEffect(() => {
      // Se não estiver visível, não inicializa e limpa o container
      if (!isVisible) {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
        setPdfLoaded(false);
        return;
      }

      // Verifica se o container existe antes de inicializar
      if (!containerRef.current) {
        return;
      }

      let destroyed = false;
      let retryTimeoutId: NodeJS.Timeout | null = null;
      // Captura o container no início para usar no cleanup
      const container = containerRef.current;

      const initializePdf = async () => {
        try {
          // Verifica novamente se o container ainda existe e não foi destruído
          if (!containerRef.current || destroyed) return;

          // Verifica se o container tem dimensões válidas
          // Se não tiver, não tenta inicializar (evita o erro)
          if (!hasValidDimensions(containerRef.current)) {
            return;
          }

          // Importa pdf.js de forma dinâmica
          const pdfjsLib = await import("pdfjs-dist");

          // Configura worker ANTES de qualquer operação com PDF
          if (typeof window !== "undefined") {
            const workerUrl = new URL(
              "/pdf-js/pdf.worker.mjs",
              window.location.origin
            ).href;
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          }

          if (destroyed || !containerRef.current) return;

          // Limpa o container sem remover classes essenciais
          const currentContainer = containerRef.current;
          currentContainer.innerHTML = "";

          // Estilos obrigatórios do container externo
          // O PDF.js REQUER position: absolute no container (verificação interna do PDFViewer)
          // Mas também precisa de dimensões válidas, então garantimos ambos
          currentContainer.style.position = "absolute";
          currentContainer.style.top = "0";
          currentContainer.style.left = "0";
          currentContainer.style.width = "100%";
          currentContainer.style.height = "100%";
          currentContainer.style.minHeight = "400px"; // GARANTE QUE NUNCA SERÁ ZERO
          currentContainer.style.overflow = "auto";
          currentContainer.style.backgroundColor = "#fff";

          // FORÇA um reflow para garantir que os estilos foram aplicados
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          currentContainer.offsetHeight;

          // Verifica novamente as dimensões DEPOIS de configurar os estilos
          // Se ainda não tiver dimensões válidas, força uma altura fixa
          const rect = currentContainer.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(currentContainer);

          // Se o container não tem altura válida, força uma altura fixa
          // Isso é necessário quando o container está dentro de uma modal que ainda está animando
          if (
            rect.height === 0 ||
            computedStyle.height === "0px" ||
            computedStyle.height === "auto"
          ) {
            // Tenta pegar a altura do container pai primeiro
            const parentElement = currentContainer.parentElement;
            let targetHeight = "600px"; // altura padrão

            if (parentElement) {
              const parentRect = parentElement.getBoundingClientRect();
              if (parentRect.height > 0) {
                targetHeight = `${parentRect.height}px`;
              }
            }

            currentContainer.style.height = targetHeight;

            // Força outro reflow
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            currentContainer.offsetHeight;
          }

          // Garante que a largura está correta
          if (rect.width === 0 || computedStyle.width === "0px") {
            currentContainer.style.width = "100%";
            // Força outro reflow
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            currentContainer.offsetHeight;
          }

          // Verificação final antes de criar o PDFViewer
          if (!hasValidDimensions(currentContainer)) {
            return;
          }

          // Cria o elemento viewer interno (estrutura obrigatória do PDF.js)
          const viewerElement = document.createElement("div");
          viewerElement.id = "viewer";
          viewerElement.className = "pdfViewer"; // OBRIGATÓRIO - o PDF.js precisa desta classe
          currentContainer.appendChild(viewerElement);

          // Tenta importar o viewer do pdfjs-dist
          const pdfjsViewerModule = await import(
            "pdfjs-dist/web/pdf_viewer"
          ).catch(() => null);

          if (!pdfjsViewerModule || destroyed || !containerRef.current) return;

          // Verificação final antes de criar o PDFViewer
          if (!hasValidDimensions(currentContainer)) {
            return;
          }

          // Aguarda um frame adicional para garantir que o DOM está totalmente renderizado
          // Isso é especialmente importante em modais que podem estar animando
          await new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve(undefined);
              });
            });
          });

          // Verificação final após aguardar os frames
          if (
            destroyed ||
            !containerRef.current ||
            !hasValidDimensions(currentContainer)
          ) {
            return;
          }

          const finalRect = currentContainer.getBoundingClientRect();
          const finalStyle = window.getComputedStyle(currentContainer);

          // Garante que o container tem altura fixa em pixels (não apenas minHeight)
          // O PDF.js precisa de dimensões concretas, não apenas minHeight
          if (
            finalRect.height === 0 ||
            finalStyle.height === "0px" ||
            finalStyle.height === "auto"
          ) {
            const fixedHeight = Math.max(600, finalRect.height || 600);
            currentContainer.style.height = `${fixedHeight}px`;
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            currentContainer.offsetHeight;
          }

          // Verificação final após forçar altura
          const finalCheckRect = currentContainer.getBoundingClientRect();
          if (finalCheckRect.width === 0 || finalCheckRect.height === 0) {
            return;
          }

          // Cria event bus e link service
          const eventBus = new pdfjsViewerModule.EventBus();
          const pdfLinkService = new pdfjsViewerModule.PDFLinkService({
            eventBus,
          });

          // Cria o PDFViewer usando o container externo e o viewer interno
          const pdfViewer = new pdfjsViewerModule.PDFViewer({
            container: currentContainer, // Container externo
            viewer: viewerElement, // Elemento viewer interno (obrigatório)
            eventBus: eventBus,
            linkService: pdfLinkService,
            enableScripting: true,
            renderInteractiveForms: true, // Habilita formulários nativos do PDF
          });

          pdfLinkService.setViewer(pdfViewer);
          pdfViewerRef.current = pdfViewer;

          // Carrega o PDF
          const loadingTask = pdfjsLib.getDocument(pdfUrl);
          const pdf = await loadingTask.promise;

          if (destroyed || !containerRef.current) return;

          pdfViewer.setDocument(pdf);
          pdfLinkService.setDocument(pdf);

          // Aguarda o PDF ser renderizado
          eventBus.on("pagesinit", () => {
            if (destroyed || !containerRef.current) return;

            // Aguarda todas as páginas serem renderizadas
            // O PDF.js pode usar lazy loading, então precisamos forçar renderização de todas as páginas
            const waitForAllPages = async () => {
              if (destroyed || !containerRef.current) return;

              const container = containerRef.current;

              // Aguarda um pouco para garantir que a primeira página começou a renderizar
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Faz scroll para garantir que todas as páginas sejam renderizadas
              if (container) {
                // Scroll até o final para forçar renderização de todas as páginas
                const scrollHeight = container.scrollHeight;

                // Scroll progressivo para garantir que todas as páginas sejam renderizadas
                container.scrollTop = scrollHeight;

                // Aguarda um pouco após o scroll para dar tempo de renderizar
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Volta ao topo
                container.scrollTop = 0;

                // Aguarda mais um pouco para garantir que tudo foi renderizado
                await new Promise((resolve) => setTimeout(resolve, 500));
              }

              if (destroyed || !containerRef.current) return;

              // Aplica valores iniciais se fornecidos
              if (
                initialValuesRef.current &&
                Object.keys(initialValuesRef.current).length > 0
              ) {
                const container = containerRef.current;
                if (!container) return;

                Object.entries(initialValuesRef.current || {}).forEach(
                  ([fieldName, value]) => {
                    const input = container.querySelector<
                      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                    >(`[name="${fieldName}"]`);

                    if (input) {
                      if (input.type === "checkbox") {
                        const strValue = String(value || "");
                        (input as HTMLInputElement).checked =
                          strValue === "Yes" ||
                          strValue === "on" ||
                          strValue === "true";
                      } else if (input.type !== "button") {
                        input.value = String(value || "");
                      }
                    }
                  }
                );

                collectFieldValues();
              }

              // Aplica readOnly se necessário
              if (readOnly && containerRef.current) {
                const inputs = containerRef.current.querySelectorAll<
                  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                >("input, textarea, select");
                inputs.forEach((input) => {
                  input.disabled = true;
                  if (input.tagName !== "SELECT") {
                    (input as HTMLInputElement | HTMLTextAreaElement).readOnly =
                      true;
                  }
                });
              }

              setPdfLoaded(true);
              collectFieldValues();
            };

            waitForAllPages();
          });
        } catch (err) {
        }
      };

      // Aguarda a modal ficar 100% visível antes de inicializar
      // Isso garante que o layout foi calculado e o container tem dimensões válidas
      const timeoutId = setTimeout(() => {
        // Verifica se tem dimensões válidas antes de inicializar
        if (hasValidDimensions(containerRef.current)) {
          initializePdf();
        } else {
          // Se ainda não tiver dimensões, tenta novamente após mais um delay
          // Isso cobre casos onde a animação da modal demora mais
          retryTimeoutId = setTimeout(() => {
            if (
              !destroyed &&
              containerRef.current &&
              hasValidDimensions(containerRef.current)
            ) {
              initializePdf();
            } else {
            }
          }, 100);
        }
      }, 50); // Aguarda 50ms para garantir que a modal terminou de abrir

      return () => {
        destroyed = true;
        clearTimeout(timeoutId);
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId);
        }
        // Usa a referência capturada no início do effect
        if (container) {
          container.innerHTML = "";
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfUrl, readOnly, isVisible, hasValidDimensions]);

    // Observa mudanças nos campos do formulário
    useEffect(() => {
      if (!pdfLoaded) return;

      const container = containerRef.current;
      if (!container) return;

      function handleFieldChange() {
        collectFieldValues();
      }

      // Função para adicionar listeners a todos os campos
      const addListenersToAllFields = () => {
        const inputs = container.querySelectorAll("input, textarea, select");

        inputs.forEach((input) => {
          // Remove listeners antigos antes de adicionar novos (evita duplicação)
          input.removeEventListener("input", handleFieldChange);
          input.removeEventListener("change", handleFieldChange);
          input.removeEventListener("blur", handleFieldChange);

          // Adiciona novos listeners
          input.addEventListener("input", handleFieldChange);
          input.addEventListener("change", handleFieldChange);
          // Também adiciona listener para blur (quando o campo perde o foco)
          input.addEventListener("blur", handleFieldChange);
        });
      };

      // Adiciona listeners iniciais
      addListenersToAllFields();

      // Usa MutationObserver para detectar quando novos campos são adicionados ao DOM
      // Isso é importante porque o PDF.js pode adicionar campos de outras páginas dinamicamente
      const observer = new MutationObserver((mutations) => {
        let hasNewFields = false;

        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            // Verifica se o nó adicionado é um campo ou contém campos
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              (node instanceof HTMLInputElement ||
                node instanceof HTMLTextAreaElement ||
                node instanceof HTMLSelectElement ||
                (node instanceof Element &&
                  (node.querySelector("input") ||
                    node.querySelector("textarea") ||
                    node.querySelector("select"))))
            ) {
              hasNewFields = true;
            }
          });
        });

        if (hasNewFields) {
          addListenersToAllFields();
          // Coleta valores novamente para garantir que temos todos os campos
          setTimeout(() => {
            collectFieldValues();
          }, 100);
        }
      });

      // Observa mudanças no container (incluindo sub-árvore)
      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      return () => {
        observer.disconnect();
        const inputs = container.querySelectorAll("input, textarea, select");
        inputs.forEach((input) => {
          input.removeEventListener("input", handleFieldChange);
          input.removeEventListener("change", handleFieldChange);
          input.removeEventListener("blur", handleFieldChange);
        });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfLoaded]);

    // Atualiza os campos quando initialValues mudar (após o PDF carregar)
    useEffect(() => {
      if (!pdfLoaded || !initialValues) return;

      const container = containerRef.current;
      if (!container) return;

      // Atualiza todos os campos com os valores de initialValues
      Object.entries(initialValues).forEach(([fieldName, value]) => {
        const input = container.querySelector<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >(`[name="${fieldName}"]`);

        if (input) {
          if (input.type === "checkbox") {
            const strValue = String(value || "");
            (input as HTMLInputElement).checked =
              strValue === "Yes" || strValue === "on" || strValue === "true";
          } else if (input.type !== "button") {
            input.value = String(value || "");
          }
        }
      });

      // Coleta os valores atualizados
      setTimeout(() => {
        collectFieldValues();
      }, 100);
    }, [initialValues, pdfLoaded, collectFieldValues]);

    return (
      <div
        className="w-full overflow-x-hidden"
        style={{
          marginBottom: "0",
          paddingBottom: "0",
          backgroundColor: "#ffffff",
          position: "relative", // Container pai precisa ser relative para o absolute do filho funcionar
          minHeight: "600px", // Altura mínima para o container funcionar
        }}
      >
        <div
          id="viewerContainer"
          className="pdfViewerContainer"
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "400px", // GARANTE QUE NUNCA SERÁ ZERO - evita erro do PDF.js
            // position será definido como absolute durante a inicialização (requisito do PDF.js)
            overflow: "auto",
            backgroundColor: "#ffffff",
          }}
        />
      </div>
    );
  }
);

PdfJsViewer.displayName = "PdfJsViewer";

export default PdfJsViewer;
