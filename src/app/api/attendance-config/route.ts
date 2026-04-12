import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

// Returns the attendance config for the logged-in user's school.
// Used by teacher punch UI to determine geo-fence rules and mode.
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const schoolId = primary?.school_id;
    if (!schoolId) return Response.json({ attendanceMode: 'class' });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        attendanceMode:           true,
        latitude:                 true,
        longitude:                true,
        geoTaggingEnabled:        true,
        geoFencingEnabled:        true,
        geoFenceRadius:           true,
        idCardIntegrationEnabled: true,
        faceRecognitionEnabled:   true,
      },
    });

    return Response.json({
      attendanceMode:           school?.attendanceMode           ?? 'class',
      latitude:                 school?.latitude                 ?? null,
      longitude:                school?.longitude                ?? null,
      geoTaggingEnabled:        school?.geoTaggingEnabled        ?? false,
      geoFencingEnabled:        school?.geoFencingEnabled        ?? false,
      geoFenceRadius:           school?.geoFenceRadius           ?? 500,
      idCardIntegrationEnabled: school?.idCardIntegrationEnabled ?? false,
      faceRecognitionEnabled:   school?.faceRecognitionEnabled   ?? false,
    });
  } catch (err) { return handleError(err); }
}
