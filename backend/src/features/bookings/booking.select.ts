export const facilityInclude = {
  category: true,
  location: true,
  room: true,
  vehicle: true,
  equipment: true,
} as const;

export const bookingInclude = {
  facility: { include: facilityInclude },
  requester: { select: { id: true, name: true } },
  responsibleUser: { select: { id: true, name: true } },
  meeting: true,
  trip: true,
  approval: true,
  usage: { include: { vehicle: true, equipment: true } },
} as const;
