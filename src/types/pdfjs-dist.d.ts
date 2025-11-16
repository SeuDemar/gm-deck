declare module "pdfjs-dist/web/pdf_viewer" {
  export class EventBus {
    on(event: string, handler: () => void): void;
    off(event: string, handler: () => void): void;
    dispatch(event: string, data?: unknown): void;
  }

  export class PDFLinkService {
    constructor(options: { eventBus: EventBus });
    setViewer(viewer: PDFViewer): void;
    setDocument(pdf: unknown): void;
  }

  export class PDFViewer {
    constructor(options: {
      container: HTMLElement;
      viewer: HTMLElement;
      eventBus: EventBus;
      linkService: PDFLinkService;
      enableScripting?: boolean;
      renderInteractiveForms?: boolean;
    });
    setDocument(pdf: unknown): void;
  }
}

declare module "pdfjs-dist/web/pdf_viewer.css" {
  const content: string;
  export default content;
}

