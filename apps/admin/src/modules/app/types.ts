export type Role = "PATIENT" | "PROFESSIONAL" | "ADMIN";
export type PatientStatus = "active" | "pause" | "cancelled" | "trial";
export type RoleFilter = Role | "ALL";
export type PortalPath =
  | "/"
  | "/patients"
  | "/professionals"
  | "/plans-packages"
  | "/sessions"
  | "/finances"
  | "/calendar"
  | "/library"
  | "/imports"
  | "/users"
  | "/web-admin"
  | "/settings"
  | "/ai";

export interface AuthApiUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  patientProfileId: string | null;
  professionalProfileId: string | null;
}

export interface AuthApiResponse {
  token: string;
  user: AuthApiUser;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN";
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  patientProfile: {
    id: string;
    timezone: string;
    status: string;
  } | null;
  professionalProfile: {
    id: string;
    visible: boolean;
    cancellationHours: number;
    bio: string | null;
    therapeuticApproach: string | null;
    yearsExperience: number | null;
    photoUrl: string | null;
    videoUrl: string | null;
  } | null;
  adminProfile: {
    id: string;
  } | null;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

export interface KpisResponse {
  kpis: {
    activePatients: number;
    activeProfessionals: number;
    scheduledSessions: number;
    monthlyRevenueCents: number;
  };
  note: string;
}

export interface LandingSettingsResponse {
  settings: {
    patientHeroImageUrl: string | null;
    patientDesktopImageUrl?: string | null;
    patientMobileImageUrl?: string | null;
    professionalDesktopImageUrl?: string | null;
    professionalMobileImageUrl?: string | null;
  };
  updatedAt: string | null;
}

export interface WebLandingSettings {
  patientHeroImageUrl: string | null;
  patientDesktopImageUrl: string | null;
  patientMobileImageUrl: string | null;
  professionalDesktopImageUrl: string | null;
  professionalMobileImageUrl: string | null;
}

export interface AdminReview {
  id: string;
  name: string;
  role: string;
  reviewDate?: string;
  relativeDate: string;
  text: string;
  rating: number;
  avatar: string;
  accent: string;
}

export interface AdminBlogPost {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  excerpt: string;
  category: string;
  coverImage: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  publishedAt: string;
  readTime: number;
  likes: number;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  body: string;
}

export interface WebContentResponse {
  settings: WebLandingSettings;
  reviews: AdminReview[];
  blogPosts: AdminBlogPost[];
  updatedAt: {
    settings: string | null;
    reviews: string | null;
    blogPosts: string | null;
  };
}

export interface AdminSessionPackage {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  stripePriceId: string;
  name: string;
  credits: number;
  priceCents: number;
  discountPercent: number;
  currency: string;
  active: boolean;
  createdAt: string;
  purchasesCount: number;
  landingPublished: boolean;
  patientPublished: boolean;
}

export interface SessionPackagesResponse {
  sessionPackages: AdminSessionPackage[];
  visibility: {
    landing: string[];
    patient: string[];
    featuredLanding: string | null;
    featuredPatient: string | null;
  };
}

export interface AdminPatientOps {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  timezone: string;
  status: string;
  activeProfessionalId?: string | null;
  activeProfessionalName?: string | null;
  assignmentStatus?: "assigned" | "pending";
  latestPurchase: {
    id: string;
    packageId?: string;
    packageName: string;
    totalCredits: number;
    remainingCredits: number;
    purchasedAt: string;
  } | null;
  bookingsCount: number;
  creditBalance: number;
}

export interface PatientsResponse {
  patients: AdminPatientOps[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

export interface PatientManagementResponse {
  patient: AdminPatientOps & {
    confirmedBookings: AdminBookingOps[];
  };
}

export interface AdminProfessionalOps {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  visible: boolean;
  cancellationHours: number;
  bio: string | null;
  therapeuticApproach: string | null;
  yearsExperience: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  bookingsCount: number;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    isBlocked: boolean;
    source: string;
  }>;
}

export interface ProfessionalsResponse {
  professionals: AdminProfessionalOps[];
}

export interface AdminBookingOps {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  consumedCredits: number;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}

export interface AdminBookingsResponse {
  bookings: AdminBookingOps[];
}

export interface CreateUserFormState {
  role: Role;
  fullName: string;
  email: string;
  password: string;
  timezone: string;
  patientStatus: PatientStatus;
  professionalVisible: boolean;
  professionalCancellationHours: string;
  professionalBio: string;
  professionalTherapeuticApproach: string;
  professionalYearsExperience: string;
  professionalPhotoUrl: string;
  professionalVideoUrl: string;
}

export interface EditUserDraft {
  role: Role;
  fullName: string;
  password: string;
  patientStatus: PatientStatus;
  patientTimezone: string;
  professionalVisible: boolean;
  professionalCancellationHours: string;
  professionalBio: string;
  professionalTherapeuticApproach: string;
  professionalYearsExperience: string;
  professionalPhotoUrl: string;
  professionalVideoUrl: string;
}
