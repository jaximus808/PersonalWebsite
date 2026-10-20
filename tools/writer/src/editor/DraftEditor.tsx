// STUB: the editor agent replaces this. The props are the contract (SPEC.md).
import type { Editor } from "@tiptap/react";
import type { DraftDoc, FigureRequest, Kind, UploadResult } from "../shared/types";

export interface DraftEditorProps {
  draftKey: string;
  initialDoc: DraftDoc;
  kind: Kind;
  slug: string;
  onChange(doc: DraftDoc): void;
  onReady?(editor: Editor): void;
  upload(file: File): Promise<UploadResult>;
  resolveSrc(src: string): string;
  figures: FigureRequest[];
}

export default function DraftEditor(_props: DraftEditorProps) {
  return <div>editor stub</div>;
}
