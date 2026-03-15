import { NotFoundError } from '@/utils/errors';
import * as repo from './parent.repo';
import type { ChildRow } from './parent.types';

export async function getChildren(userId: string): Promise<{ children: ChildRow[] }> {
  const parent = await repo.findParentByUserId(userId);
  if (!parent) throw new NotFoundError('Parent profile');

  const links = await repo.findChildrenByParentId(parent.id);

  return {
    children: links.map((ps) => ({
      id:               ps.student.id,
      first_name:       ps.student.firstName,
      last_name:        ps.student.lastName,
      admission_no:     ps.student.admissionNo,
      photo_url:        ps.student.photoUrl,
      school_id:        ps.student.schoolId,
      school_name:      ps.student.school.name,
      class_id:         ps.student.classId,
      grade:            ps.student.class?.grade   ?? null,
      section:          ps.student.class?.section ?? null,
      relationship:     ps.relationship,
      is_primary_child: ps.isPrimary,
    })),
  };
}
