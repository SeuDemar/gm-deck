"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  pdfUrl: string;
  onValues?: (values: Record<string, string>) => void;
}

export default function PdfJsViewer({ pdfUrl, onValues }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  // Usa ref para onValues para evitar re-renders desnecessários
  const onValuesRef = useRef(onValues);
  useEffect(() => {
    onValuesRef.current = onValues;
  }, [onValues]);

  const collectFieldValues = useCallback(() => {
    const container = containerRef.current;
    if (!container) return {};

    const values: Record<string, string> = {};

    const inputs = container.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(
      ".annotationLayer input[name], .annotationLayer textarea[name], .annotationLayer select[name]"
    );

    inputs.forEach((el) => {
      const name = el.getAttribute("name");
      if (!name) return;

      if (
        el instanceof HTMLInputElement &&
        (el.type === "checkbox" || el.type === "radio")
      ) {
        values[name] = el.checked ? el.value || "on" : "";
      } else {
        values[name] = el.value ?? "";
      }
    });

    // Usa ref em vez de onValues diretamente
    onValuesRef.current?.(values);
    return values;
  }, []); // Removido onValues das dependências

  useEffect(() => {
    let mounted = true;

    async function init() {
      // import moderno do pdf.js
      const pdfjsLib = await import("pdfjs-dist");
      // @ts-expect-error pdfjs-dist has no TypeScript definitions for pdf_viewer
      await import("pdfjs-dist/web/pdf_viewer.css");

      // worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf-js/pdf.worker.mjs";

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      if (!mounted) return;

      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });

        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.style.margin = "0 auto 20px";
        container.appendChild(wrapper);

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        wrapper.appendChild(canvas);

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;

        // annotation layer
        const annotationLayerDiv = document.createElement("div");
        annotationLayerDiv.className = "annotationLayer";
        annotationLayerDiv.style.position = "absolute";
        annotationLayerDiv.style.left = "0";
        annotationLayerDiv.style.top = "0";
        annotationLayerDiv.style.width = "100%";
        annotationLayerDiv.style.height = "100%";
        wrapper.appendChild(annotationLayerDiv);

        const annotations = await page.getAnnotations();

        try {
          // Importa o módulo pdf_viewer
          // @ts-expect-error pdfjs-dist has no TypeScript definitions for pdf_viewer
          const pdfViewerModule = await import("pdfjs-dist/web/pdf_viewer");

          console.log("📦 Módulo pdf_viewer carregado:", pdfViewerModule);
          console.log(
            "🔍 Chaves disponíveis no módulo:",
            Object.keys(pdfViewerModule)
          );

          // Tenta diferentes formas de acessar AnnotationLayer
          let AnnotationLayer = pdfViewerModule.AnnotationLayer;
          console.log("1️⃣ AnnotationLayer (direto):", AnnotationLayer);

          if (!AnnotationLayer && pdfViewerModule.default) {
            AnnotationLayer = pdfViewerModule.default.AnnotationLayer;
            console.log("2️⃣ AnnotationLayer (default):", AnnotationLayer);
          }

          if (!AnnotationLayer) {
            // Tenta acessar diretamente do objeto (sem tipos definidos)
            const moduleAny = pdfViewerModule as Record<string, unknown>;
            AnnotationLayer =
              moduleAny.AnnotationLayer as typeof AnnotationLayer;
            console.log("3️⃣ AnnotationLayer (any):", AnnotationLayer);
          }

          if (!AnnotationLayer) {
            console.warn(
              "⚠️ AnnotationLayer não encontrado, pulando renderização de anotações"
            );
            console.log("📋 Estrutura completa do módulo:", pdfViewerModule);
            continue;
          }

          console.log("✅ AnnotationLayer encontrado:", AnnotationLayer);

          // Cria um SimpleLinkService simples
          const linkService = {
            getDestinationHash: () => "",
            getAnchorUrl: () => "",
            setHash: () => {},
            executeNamedAction: () => {},
            executeSetOCGState: () => {},
            onFileAttachmentAnnotation: () => {},
          };

          AnnotationLayer.render({
            viewport: viewport.clone({ dontFlip: true }),
            div: annotationLayerDiv,
            annotations,
            page,
            linkService,
          });
        } catch (err) {
          console.error("Erro ao renderizar anotações:", err);
          // Continua sem as anotações se houver erro
        }
      }

      setPdfLoaded(true);

      // Coleta valores iniciais após carregar
      setTimeout(() => {
        if (mounted) collectFieldValues();
      }, 500);
    }

    init().catch((err) => {
      console.error("Erro ao carregar PDF.js:", err);
    });

    return () => {
      mounted = false;
    };
  }, [pdfUrl, collectFieldValues]); // collectFieldValues é estável (useCallback sem deps)

  // Observa mudanças nos campos do formulário
  useEffect(() => {
    if (!pdfLoaded) return;

    const container = containerRef.current;
    if (!container) return;

    function handleFieldChange() {
      collectFieldValues();
    }

    // Adiciona listeners para mudanças nos campos
    const inputs = container.querySelectorAll(
      ".annotationLayer input, .annotationLayer textarea, .annotationLayer select"
    );

    inputs.forEach((input) => {
      input.addEventListener("input", handleFieldChange);
      input.addEventListener("change", handleFieldChange);
    });

    return () => {
      inputs.forEach((input) => {
        input.removeEventListener("input", handleFieldChange);
        input.removeEventListener("change", handleFieldChange);
      });
    };
  }, [pdfLoaded, collectFieldValues]); // collectFieldValues é estável (useCallback sem deps)

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
