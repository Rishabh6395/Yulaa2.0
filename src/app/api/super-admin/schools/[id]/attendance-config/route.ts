import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const GEO_SELECT = {
  attendanceMode:           true,
  latitude:                 true,
  longitude:                true,
  geoTaggingEnabled:        true,
  geoFencingEnabled:        true,
  geoFenceRadius:           true,
  idCardIntegrationEnabled: true,
  faceRecognitionEnabled:   true,
  integrationConfig:        true,
} as const;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const school = await prisma.school.findUnique({
      where: { id: params.id },
      select: GEO_SELECT,
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
      integrationConfig:        school?.integrationConfig        ?? null,
    });
  } catch (err) { return handleError(err); }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r) => r.role_code === 'super_admin')) throw new ForbiddenError();

    const body = await request.json();
    const {
      attendanceMode,
      latitude,
      longitude,
      geoTaggingEnabled,
      geoFencingEnabled,
      geoFenceRadius,
      idCardIntegrationEnabled,
      faceRecognitionEnabled,
      integrationConfig,
    } = body;

    if (attendanceMode !== undefined && !['class', 'daily', 'card', 'face'].includes(attendanceMode)) {
      throw new AppError('Invalid attendance mode');
    }
    if (geoFencingEnabled && geoTaggingEnabled) {
      throw new AppError('Geo Tagging and Geo Fencing cannot both be enabled simultaneously');
    }
    if (geoFencingEnabled) {
      if (latitude == null || longitude == null) {
        throw new AppError('School latitude and longitude are required when Geo Fencing is enabled');
      }
      if (!geoFenceRadius || geoFenceRadius <= 0) {
        throw new AppError('A positive fence radius is required when Geo Fencing is enabled');
      }
    }

    const data: Record<string, unknown> = {};
    if (attendanceMode           !== undefined) data.attendanceMode           = attendanceMode;
    if (latitude                 !== undefined) data.latitude                 = latitude;
    if (longitude                !== undefined) data.longitude                = longitude;
    if (geoTaggingEnabled        !== undefined) data.geoTaggingEnabled        = geoTaggingEnabled;
    if (geoFencingEnabled        !== undefined) data.geoFencingEnabled        = geoFencingEnabled;
    if (geoFenceRadius           !== undefined) data.geoFenceRadius           = geoFenceRadius;
    if (idCardIntegrationEnabled !== undefined) data.idCardIntegrationEnabled = idCardIntegrationEnabled;
    if (faceRecognitionEnabled   !== undefined) data.faceRecognitionEnabled   = faceRecognitionEnabled;
    if (integrationConfig        !== undefined) data.integrationConfig        = integrationConfig;

    const school = await prisma.school.update({
      where: { id: params.id },
      data,
      select: GEO_SELECT,
    });

    return Response.json({ ok: true, ...school });
  } catch (err) { return handleError(err); }
}
