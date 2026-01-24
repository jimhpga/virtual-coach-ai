export type VcaIntake = Record<string, any>;

export type VcaAnalyzeResponse = {
  ok?: boolean;
  error?: string;
  report?: any;
  data?: any;
  debug?: any;
};
