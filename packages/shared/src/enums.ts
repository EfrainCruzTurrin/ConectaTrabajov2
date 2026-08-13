// Estos enums deben mantenerse idénticos a los definidos en /prisma/schema.prisma.
// Se usan en DTOs (api) y en tipado de formularios/UI (web) sin duplicar el string literal.

export enum Role {
  CLIENT = 'CLIENT',
  WORKER = 'WORKER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  DELETED = 'DELETED',
}

export enum VerificationType {
  IDENTITY = 'IDENTITY',
  PROFESSIONAL = 'PROFESSIONAL',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum ReviewStatus {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
  REPORTED = 'REPORTED',
}

export enum ContactChannel {
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
}
