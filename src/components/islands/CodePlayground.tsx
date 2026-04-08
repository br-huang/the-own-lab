import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import type { CodePlaygroundProps } from "@/types/docs";

export default function CodePlayground({
  files,
  template = "react-ts",
  showPreview = true,
}: CodePlaygroundProps) {
  return (
    <div className="my-6 rounded-lg overflow-hidden border border-gray-200">
      <SandpackProvider template={template} files={files}>
        <SandpackLayout>
          <SandpackCodeEditor
            showLineNumbers
            showTabs
            style={{ minHeight: "300px" }}
          />
          {showPreview && (
            <SandpackPreview style={{ minHeight: "300px" }} />
          )}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
