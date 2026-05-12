import { vi } from 'vitest';

// Deep mock factory for Prisma model delegates
function modelMock() {
  return {
    findMany:   vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst:  vi.fn().mockResolvedValue(null),
    create:     vi.fn().mockResolvedValue({}),
    update:     vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    upsert:     vi.fn().mockResolvedValue({}),
    delete:     vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count:      vi.fn().mockResolvedValue(0),
    aggregate:  vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
}

export const prismaMock = {
  user:                  modelMock(),
  school:                modelMock(),
  student:               modelMock(),
  teacher:               modelMock(),
  parent:                modelMock(),
  parentStudent:         modelMock(),
  class:                 modelMock(),
  attendance:            modelMock(),
  homework:              modelMock(),
  homeworkSubmission:    modelMock(),
  feeInvoice:            modelMock(),
  feeStructure:          modelMock(),
  leaveRequest:          modelMock(),
  leaveTypeMaster:       modelMock(),
  leaveBalancePolicy:    modelMock(),
  leaveWorkflow:         modelMock(),
  leaveAction:           modelMock(),
  announcement:          modelMock(),
  complianceItem:        modelMock(),
  admissionApplication:  modelMock(),
  admissionWorkflow:     modelMock(),
  admissionChild:        modelMock(),
  transportRoute:        modelMock(),
  transportBus:          modelMock(),
  transportRide:         modelMock(),
  rideStudent:           modelMock(),
  exam:                  modelMock(),
  examResult:            modelMock(),
  holidayCalendar:       modelMock(),
  role:                  modelMock(),
  userRole:              modelMock(),
  menuPermission:        modelMock(),
  genericWorkflow:       modelMock(),
  genericMasterType:     modelMock(),
  genericMasterValue:    modelMock(),
  studentQuery:          modelMock(),
  timetable:             modelMock(),
  timetableSlot:         modelMock(),
  $transaction:          vi.fn().mockImplementation((fn: any) => fn(prismaMock)),
  $connect:              vi.fn(),
  $disconnect:           vi.fn(),
};

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));

// Reset all mocks between tests
export function resetPrisma() {
  Object.values(prismaMock).forEach((model: any) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((fn: any) => { if (typeof fn?.mockReset === 'function') fn.mockReset(); });
    }
  });
}
