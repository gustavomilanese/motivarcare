export type PatientTabParamList = {
  home: undefined;
  sessions: undefined;
  chat: undefined;
  profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  VerifyEmailToken: { token?: string } | undefined;
};

export type PostIntakeParamList = {
  CalendarConnect: undefined;
  Matching: undefined;
};

export type PatientRootStackParamList = {
  Tabs: undefined;
  ProfessionalMatching: undefined;
  DiaryHome: undefined;
  DiaryNew: { mood?: import("../wellbeing/types").EmotionalDiaryMood } | undefined;
  DiaryRecords: undefined;
  ExercisesList: undefined;
  ExerciseDetail: { slug: string };
  ExerciseRoutine: { slug: string };
  RelaxationMusic: undefined;
  HelpFaq: undefined;
};
