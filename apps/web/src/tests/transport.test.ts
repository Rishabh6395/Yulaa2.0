import { describe, it, expect, beforeEach } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

import { GET as ridesGET, POST as ridesPOST } from '@/app/api/transport/rides/route';
import { GET as rideGET, PATCH as ridePATCH } from '@/app/api/transport/rides/[id]/route';

const ROUTE = { id: 'route-1', schoolId: 'school-1', name: 'Route A', stops: [] };
const BUS = { id: 'bus-1', schoolId: 'school-1', busNumber: 'BUS-01', gpsEnabled: false, isActive: true };
const RIDE = {
  id: 'ride-1', schoolId: 'school-1', routeId: 'route-1', busId: 'bus-1',
  employeeId: 'user-teacher', direction: 'morning', status: 'pending',
  gpsEnabled: false, gpsLat: null, gpsLng: null, emergencyContact: '9999999999',
  departureTime: null, arrivalTime: null, createdAt: new Date(),
  route: { id: 'route-1', name: 'Route A', stops: [], vehicleNo: 'MH-01' },
  bus: { id: 'bus-1', busNumber: 'BUS-01', gpsEnabled: false },
  employee: { firstName: 'Teacher', lastName: 'User' },
  rideStudents: [{ id: 'rs-1', studentId: 'stu-1', pickupStatus: 'pending', dropStatus: 'pending', notifiedAt: null, student: { id: 'stu-1', firstName: 'Rohan', lastName: 'Sharma', class: { grade: '10', section: 'A' } } }],
  _count: { rideStudents: 1 },
};

function makeParams(id: string) {
  return Promise.resolve({ id });
}

describe('🚌 TRANSPORT MODULE', () => {
  beforeEach(() => { resetPrisma(); });

  // ── Rides List / Create ────────────────────────────────────────────────
  describe('GET /api/transport/rides', () => {
    it('[+] school_admin can list all rides for school', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.transportRide.findMany.mockResolvedValue([RIDE] as any);
      const req = makeGetRequest('/api/transport/rides');
      const res = await ridesGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.rides)).toBe(true);
    });

    it('[+] teacher can list own rides only', async () => {
      setUser(USERS.teacher);
      prismaMock.transportRide.findMany.mockResolvedValue([RIDE] as any);
      const req = makeGetRequest('/api/transport/rides');
      const res = await ridesGET(req);
      expect(res.status).toBe(200);
    });

    it('[+] parent can view rides for own children', async () => {
      setUser(USERS.parent);
      prismaMock.parent.findUnique.mockResolvedValue({
        id: 'par-1', userId: 'user-parent',
        parentStudents: [{ studentId: 'stu-1' }],
      } as any);
      prismaMock.rideStudent.findMany.mockResolvedValue([{
        id: 'rs-1', studentId: 'stu-1',
        ride: RIDE,
        student: { id: 'stu-1', firstName: 'Rohan', lastName: 'Sharma' },
      }] as any);
      const req = makeGetRequest('/api/transport/rides');
      const res = await ridesGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.rideStudents).toBeDefined();
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      const res = await ridesGET(makeGetRequest('/api/transport/rides'));
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/transport/rides — create ride', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] teacher can create a ride with valid route and students', async () => {
      prismaMock.transportRoute.findFirst.mockResolvedValue(ROUTE as any);
      prismaMock.transportBus.findFirst.mockResolvedValue(BUS as any);
      prismaMock.student.findMany.mockResolvedValue([{ id: 'stu-1' }] as any);
      prismaMock.transportRide.create.mockResolvedValue(RIDE as any);
      const req = makeRequest('POST', '/api/transport/rides', {
        routeId: 'route-1', busId: 'bus-1', direction: 'morning',
        studentIds: ['stu-1'], emergencyContact: '9999999999',
      });
      const res = await ridesPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ride).toBeDefined();
    });

    it('[-] cannot create ride without routeId', async () => {
      const req = makeRequest('POST', '/api/transport/rides', {
        studentIds: ['stu-1'],
      });
      const res = await ridesPOST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[-] cannot create ride with empty studentIds', async () => {
      const req = makeRequest('POST', '/api/transport/rides', {
        routeId: 'route-1', studentIds: [],
      });
      const res = await ridesPOST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[-] cannot create ride with route from another school', async () => {
      prismaMock.transportRoute.findFirst.mockResolvedValue(null); // not found in school
      const req = makeRequest('POST', '/api/transport/rides', {
        routeId: 'route-99', studentIds: ['stu-1'],
      });
      const res = await ridesPOST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[-] cannot create ride with students from another school', async () => {
      prismaMock.transportRoute.findFirst.mockResolvedValue(ROUTE as any);
      prismaMock.student.findMany.mockResolvedValue([]); // 0 found vs 1 requested
      const req = makeRequest('POST', '/api/transport/rides', {
        routeId: 'route-1', studentIds: ['stu-99'],
      });
      const res = await ridesPOST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[-] unauthenticated cannot create ride', async () => {
      setUser(null);
      const res = await ridesPOST(makeRequest('POST', '/api/transport/rides', { routeId: 'r1', studentIds: ['s1'] }));
      expect(res.status).toBe(401);
    });
  });

  // ── Ride Detail / Actions ──────────────────────────────────────────────
  describe('GET /api/transport/rides/[id]', () => {
    it('[+] school_admin can get ride detail', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.transportRide.findUnique.mockResolvedValue(RIDE as any);
      const res = await rideGET(makeGetRequest('/api/transport/rides/ride-1'), { params: makeParams('ride-1') });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ride).toBeDefined();
    });

    it('[-] cannot access ride from another school', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.transportRide.findUnique.mockResolvedValue({ ...RIDE, schoolId: 'school-99' } as any);
      const res = await rideGET(makeGetRequest('/api/transport/rides/ride-1'), { params: makeParams('ride-1') });
      expect(res.status).toBe(403);
    });

    it('[-] returns 404 for non-existent ride', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.transportRide.findUnique.mockResolvedValue(null);
      const res = await rideGET(makeGetRequest('/api/transport/rides/bad-id'), { params: makeParams('bad-id') });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PATCH /api/transport/rides/[id] — ride actions', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] can depart (start) a pending ride', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue(RIDE as any);
      prismaMock.transportRide.update.mockResolvedValue({ ...RIDE, status: 'active', departureTime: new Date(), rideStudents: RIDE.rideStudents } as any);
      prismaMock.rideStudent.updateMany.mockResolvedValue({ count: 1 } as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'depart' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ride.status ?? data.ride).toBeDefined();
    });

    it('[-] cannot depart a ride that is already active', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue({ ...RIDE, status: 'active' } as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'depart' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[+] can complete an active ride', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue({ ...RIDE, status: 'active' } as any);
      prismaMock.transportRide.update.mockResolvedValue({ ...RIDE, status: 'completed', arrivalTime: new Date() } as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'complete' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBe(200);
    });

    it('[-] cannot complete a pending ride', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue({ ...RIDE, status: 'pending' } as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'complete' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[+] can cancel a ride', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue(RIDE as any);
      prismaMock.transportRide.update.mockResolvedValue({ ...RIDE, status: 'cancelled' } as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'cancel' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBe(200);
    });

    it('[+] can mark student pickup', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue({ ...RIDE, status: 'active' } as any);
      prismaMock.rideStudent.findFirst.mockResolvedValue({ id: 'rs-1', rideId: 'ride-1', studentId: 'stu-1' } as any);
      prismaMock.rideStudent.update.mockResolvedValue({ id: 'rs-1', pickupStatus: 'picked' } as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'student_pickup', studentId: 'stu-1', status: 'picked' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBe(200);
    });

    it('[-] student_pickup fails if student not on ride', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue({ ...RIDE, status: 'active' } as any);
      prismaMock.rideStudent.findFirst.mockResolvedValue(null);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'student_pickup', studentId: 'stu-99', status: 'picked' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[+] can update GPS location', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue({ ...RIDE, status: 'active' } as any);
      prismaMock.transportRide.update.mockResolvedValue({ ...RIDE, gpsLat: 18.52, gpsLng: 73.85 } as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'gps_update', lat: 18.52, lng: 73.85 }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBe(200);
    });

    it('[-] unknown action returns 400', async () => {
      prismaMock.transportRide.findUnique.mockResolvedValue(RIDE as any);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'fly' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      const res = await ridePATCH(
        makeRequest('PATCH', '/api/transport/rides/ride-1', { action: 'depart' }),
        { params: makeParams('ride-1') },
      );
      expect(res.status).toBe(401);
    });
  });
});
