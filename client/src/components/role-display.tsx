import { useUiTerms } from "@/hooks/use-ui-terms";

interface RoleDisplayProps {
  role: string;
  className?: string;
}

export function RoleDisplay({ role, className }: RoleDisplayProps) {
  const { data: terms } = useUiTerms({ category: "user_roles" });
  
  const getRoleLabel = (roleValue: string) => {
    const term = terms?.find(t => t.termKey === roleValue);
    return term?.termValue || roleValue;
  };

  return (
    <span className={className}>
      {getRoleLabel(role)}
    </span>
  );
}

interface RoleSelectOptionsProps {
  onSelect?: (value: string) => void;
  value?: string;
  children: (options: Array<{ value: string; label: string }>) => React.ReactNode;
}

export function RoleSelectOptions({ children }: RoleSelectOptionsProps) {
  const { data: terms } = useUiTerms({ category: "user_roles" });
  
  const roleOptions = [
    { value: "field_worker", termKey: "field_worker" },
    { value: "project_manager", termKey: "project_manager" },
    { value: "hq_management", termKey: "hq_management" },
    { value: "executive", termKey: "executive" },
    { value: "admin", termKey: "admin" }
  ];

  const options = roleOptions.map(role => {
    const term = terms?.find(t => t.termKey === role.termKey);
    return {
      value: role.value,
      label: term?.termValue || role.value
    };
  });

  return <>{children(options)}</>;
}