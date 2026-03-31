import { useQuery } from '@tanstack/react-query';
import { getFormConfig } from '../api/client';

export function useFormConfig(
  schoolId: string | undefined,
  formId: string,
  role: string,
) {
  return useQuery({
    queryKey: ['form-config', schoolId, formId, role],
    queryFn: () => getFormConfig(schoolId!, formId),
    enabled: !!schoolId,
    select: (d) =>
      (d?.configs?.[formId]?.[role] ?? {}) as Record<string, 'required' | 'optional' | 'hidden'>,
  });
}
