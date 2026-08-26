export interface LabelFields {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  governmentWarningText: string;
  governmentWarningFormatted: boolean;
}

export interface ApplicationData {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  governmentWarningText: string;
  governmentWarningFormatted: boolean;
}

export interface FieldVerification {
  pass: boolean;
  reason: string;
}

export interface VerificationResult {
  brandName: FieldVerification;
  classType: FieldVerification;
  alcoholContent: FieldVerification;
  netContents: FieldVerification;
  governmentWarningText: FieldVerification;
  governmentWarningFormatted: FieldVerification;
  overallPass: boolean;
}
