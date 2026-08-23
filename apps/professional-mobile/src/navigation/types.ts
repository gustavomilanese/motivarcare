export type AuthStackParamList = {
  Login: undefined;
};

export type ProTabParamList = {
  dashboard: undefined;
  horarios: undefined;
  pacientes: undefined;
  chat: undefined;
  ingresos: undefined;
};

export type ProRootStackParamList = {
  Tabs: undefined;
  Profile: undefined;
  Settings: undefined;
  AgendaSettings: undefined;
  Reports: undefined;
  PatientDetail: { patientId: string; patientName: string };
};
