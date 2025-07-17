import { useParams } from "wouter";
import TemplateBuilderFixed from "@/components/template-builder-fixed";

export default function TemplateEdit() {
  const params = useParams();
  const templateId = params.id ? parseInt(params.id) : undefined;

  return (
    <div className="p-6">
      <TemplateBuilderFixed templateId={templateId} />
    </div>
  );
}