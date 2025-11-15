"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  pdfUrl: string;
  onValues?: (values: Record<string, string>) => void;
  initialValues?: Record<string, string>; // Valores iniciais para popular os campos
}

interface FieldPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FieldOption {
  exportValue?: string;
  displayValue?: string;
  value?: string;
}

interface FieldData {
  name: string;
  type: string;
  fieldType: string;
  fieldValue?: string | boolean;
  defaultValue?: string;
  textSize?: number;
  multiLine?: boolean;
  page?: number;
  pageNum?: number;
  position?: FieldPosition;
  options?: FieldOption[];
  checkbox?: boolean;
  checkBox?: boolean;
  adjustments?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  };
  buttonValue?: string;
  fontFamily?: string;
}

export default function PdfJsViewer({ pdfUrl, onValues, initialValues }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    if (!container) return {};

    const values: Record<string, string> = {};

    // Busca campos em qualquer lugar do container (PDFPageView renderiza em diferentes estruturas)
    const inputs = container.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(
      "input[name], textarea[name], select[name]"
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
      // Importa pdf.js de forma dinâmica
      const pdfjsLib = await import("pdfjs-dist");

      // Configura worker ANTES de qualquer operação com PDF
      // Usa worker local da pasta public com URL absoluta
      if (typeof window !== "undefined") {
        // Constrói URL absoluta para o worker local
        // Isso garante que funcione tanto em dev quanto em produção
        const workerUrl = new URL("/pdf-js/pdf.worker.mjs", window.location.origin).href;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      }

      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";

      // Carrega o mapeamento de coordenadas PRIMEIRO (em pixels)
      let coordinatesMap: Record<string, FieldData> = {};
      try {
        const response = await fetch("/data/ficha-coordinates-pixels.json");
        if (response.ok) {
          const data = await response.json();
          coordinatesMap = data.fields || {};
        }
      } catch (err) {
        console.warn("Não foi possível carregar mapeamento de coordenadas em pixels, tentando formato antigo:", err);
        // Fallback para formato antigo (pontos)
        try {
          const responseOld = await fetch("/data/ficha-coordinates.json");
          if (responseOld.ok) {
            const dataOld = await responseOld.json();
            coordinatesMap = dataOld.fields || {};
          }
        } catch (errOld) {
          console.warn("Não foi possível carregar mapeamento de coordenadas:", errOld);
        }
      }

      // Carrega o PDF
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      if (!mounted) return;

      // Para cada página, renderiza canvas + campos de formulário
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });

        // Wrapper para a página
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.style.margin = "0 auto 20px";
        container.appendChild(wrapper);

        // Canvas para renderizar o PDF
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.pointerEvents = "none";
        wrapper.appendChild(canvas);

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        // Container para campos de formulário
        const annotationLayerDiv = document.createElement("div");
        annotationLayerDiv.className = "annotationLayer";
        annotationLayerDiv.style.position = "absolute";
        annotationLayerDiv.style.left = "0";
        annotationLayerDiv.style.top = "0";
        annotationLayerDiv.style.width = `${viewport.width}px`;
        annotationLayerDiv.style.height = `${viewport.height}px`;
        annotationLayerDiv.style.pointerEvents = "auto";
        wrapper.appendChild(annotationLayerDiv);


        // Renderiza campos de formulário DIRETAMENTE DO JSON
        Object.entries(coordinatesMap).forEach(([fieldName, fieldData]: [string, FieldData]) => {
          try {
            // Verifica se o campo pertence a esta página
            let fieldPage = fieldData.page || fieldData.pageNum;
            
            // Verifica se tem coordenadas em pixels
            if (!fieldData.position || typeof fieldData.position !== 'object') {
              console.warn(`Campo ${fieldName} não tem position definido`);
              return;
            }

            // Usa position (pixels) diretamente
            let left = fieldData.position.left || 0;
            let top = fieldData.position.top || 0;
            let width = fieldData.position.width || 0;
            let height = fieldData.position.height || 0;

            // Se não tem página definida, detecta automaticamente baseado na posição Y
            if (!fieldPage) {
              // Altura da página em pixels (calculada a partir do viewport)
              const pageHeightPx = viewport.height;
              // Se o campo está além da altura da primeira página, está na segunda
              if (top >= pageHeightPx) {
                fieldPage = 2;
              } else {
                fieldPage = 1;
              }
            }
            
            // Se não é esta página, pula
            if (fieldPage !== pageNum) return;
            
            // Aplica ajustes finos do mapeamento se disponíveis
            if (fieldData.adjustments) {
              left += fieldData.adjustments.left || 0;
              top += fieldData.adjustments.top || 0;
              width += (fieldData.adjustments.width || 0);
              height += (fieldData.adjustments.height || 0);
            }

            // Se não está na primeira página, ajusta o top
            if (fieldPage > 1) {
              // Para páginas seguintes, precisa subtrair a altura acumulada das páginas anteriores
              const accumulatedHeight = (fieldPage - 1) * viewport.height;
              top -= accumulatedHeight;
            }
              
            // Cria o elemento HTML baseado no tipo de campo DO JSON
            let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            const fieldType = fieldData.type || "Tx"; // Padrão: textfield
            
            if (fieldType === "Tx") {
              if (fieldData.multiLine) {
                input = document.createElement("textarea");
                (input as HTMLTextAreaElement).rows = Math.max(1, Math.floor(height / 16));
              } else {
                input = document.createElement("input");
                input.type = "text";
              }
            } else if (fieldType === "Ch") {
              input = document.createElement("select");
              const options = fieldData.options;
              if (options && Array.isArray(options)) {
                options.forEach((opt: FieldOption) => {
                  const option = document.createElement("option");
                  option.value = opt.exportValue || opt.displayValue || opt.value || "";
                  option.textContent = opt.displayValue || opt.exportValue || opt.value || "";
                  if (opt.exportValue === fieldData.fieldValue || opt.value === fieldData.fieldValue) {
                    option.selected = true;
                  }
                  input.appendChild(option);
                });
              }
            } else if (fieldType === "Btn") {
              input = document.createElement("input");
              if (fieldData.checkbox || fieldData.checkBox) {
                input.type = "checkbox";
                // Prioriza initialValues para checkboxes também
                const initialValue = initialValuesRef.current?.[fieldName];
                const checkboxValue = initialValue !== undefined 
                  ? initialValue 
                  : fieldData.fieldValue;
                input.checked = checkboxValue === "Yes" || checkboxValue === true || checkboxValue === "on" || checkboxValue === "true";
              } else {
                input.type = "button";
                const initialValue = initialValuesRef.current?.[fieldName];
                const fieldValue = fieldData.fieldValue !== undefined ? String(fieldData.fieldValue) : "";
                input.value = initialValue !== undefined 
                  ? String(initialValue) 
                  : (fieldValue || fieldData.buttonValue || "");
              }
            } else {
              input = document.createElement("input");
              input.type = "text";
            }
              
            // Configura propriedades do campo
            input.name = fieldName;
            if (input.type !== "checkbox" && input.type !== "button") {
              // Prioriza initialValues (dados do banco), depois fieldValue (do JSON), depois defaultValue
              const initialValue = initialValuesRef.current?.[fieldName];
              const fieldValue = fieldData.fieldValue !== undefined ? String(fieldData.fieldValue) : "";
              input.value = initialValue !== undefined 
                ? String(initialValue) 
                : (fieldValue || fieldData.defaultValue || "");
            }
              
            // Posiciona o campo
            input.style.position = "absolute";
            input.style.left = `${left}px`;
            input.style.top = `${top}px`;
            input.style.width = `${width}px`;
            input.style.height = `${height}px`;
            input.style.pointerEvents = "auto";
            input.style.zIndex = "10";
            input.style.border = "1px solid #ccc";
            input.style.padding = "2px 4px";
            input.style.fontSize = `${fieldData.textSize || 12}px`;
            input.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
            input.style.boxSizing = "border-box";
            input.style.fontFamily = fieldData.fontFamily || "inherit";
            
            // Centraliza o texto nos campos de texto (não em selects, checkboxes ou botões)
            if (input.type === "text" || input.tagName === "TEXTAREA") {
              input.style.textAlign = "center";
            } else if (input.tagName === "SELECT") {
              // Para selects, centraliza o texto dentro das opções
              input.style.textAlign = "center";
            }
            
            // Debug para o campo "forca"
            if (fieldName === "forca") {
              console.log(`%c🔍 Debug campo "forca":`, "color: #FF5722; font-size: 14px; font-weight: bold;");
              console.log(`  JSON position:`, fieldData.position);
              console.log(`  Calculated: left=${left}, top=${top}, width=${width}, height=${height}`);
              console.log(`  Wrapper width: ${viewport.width}px, height: ${viewport.height}px`);
              console.log(`  annotationLayerDiv rect:`, annotationLayerDiv.getBoundingClientRect());
              const inputRect = input.getBoundingClientRect();
              console.log(`  Input final rect:`, inputRect);
              console.log(`  Input style left: ${input.style.left}, top: ${input.style.top}`);
            }
              
            annotationLayerDiv.appendChild(input);
          } catch (fieldErr) {
            console.warn(`Erro ao renderizar campo ${fieldName}:`, fieldErr);
          }
        });
      }

      setPdfLoaded(true);

      // Coleta valores iniciais após carregar
      setTimeout(() => {
        if (mounted) collectFieldValues();
      }, 1000);
    }

    init().catch((err) => {
      console.error("Erro ao carregar PDF.js:", err);
    });

    return () => {
      mounted = false;
    };
  }, [pdfUrl, collectFieldValues]);

  // Observa mudanças nos campos do formulário
  useEffect(() => {
    if (!pdfLoaded) return;

    const container = containerRef.current;
    if (!container) return;

    function handleFieldChange() {
      collectFieldValues();
    }

    // Adiciona listeners para mudanças nos campos (busca em toda a estrutura)
    const inputs = container.querySelectorAll(
      "input, textarea, select"
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

  // Atualiza os campos quando initialValues mudar (após o PDF carregar)
  useEffect(() => {
    if (!pdfLoaded || !initialValues) return;

    const container = containerRef.current;
    if (!container) return;

    // Atualiza todos os campos com os valores de initialValues
    Object.entries(initialValues).forEach(([fieldName, value]) => {
      const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${fieldName}"]`
      );
      
      if (input) {
        if (input.type === "checkbox") {
          const strValue = String(value || "");
          (input as HTMLInputElement).checked = strValue === "Yes" || strValue === "on" || strValue === "true";
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
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

