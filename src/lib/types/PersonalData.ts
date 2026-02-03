
export type PersonalData = {
  personalDataId: number;
  employeeId: number;
  biometricNo: string;

  surname: string;
  firstname: string;
  middlename: string;
  extname?: string;

  dob: string; // formatted date string from backend
  pob?: string;

  sex_id: number;
  civilStatus_id: number;

  mobileNo: string;
  email: string;

  employeePicture?: string | null; // base64
  employeeSignature?: string | null;

  resAddress?: string;
  permAddress?: string;

  // add more fields as needed later
}